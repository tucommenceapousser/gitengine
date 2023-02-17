/*
| Provides the ssh interface.
*/

def.abstract = true;

const crypto = require( 'crypto' );
const ssh2 = require( 'ssh2' );

const LfsManager = tim.require( 'Lfs/Manager' );
const Log = tim.require( 'Log/Self' );
const SshGit = tim.require( 'Ssh/Git' );
const SshLfs = tim.require( 'Ssh/Lfs' );
const UserManager = tim.require( 'User/Manager' );

/*
| Configured ips.
*/
let _ips = [ '0.0.0.0' ];

/*
| Port to listen to.
*/
let _port = 22;

/*
| Host keys.
*/
let _hostKeys;

/*
| Sets the host keys.
*/
def.static.setHostKeys = function( keys ) { _hostKeys = keys; };

/*
| Sets IPs to listen to.
|
| ~ips: array of strings.
*/
def.static.setIPs = function( ips ) { _ips = ips; };

/*
| Sets Port to listen to.
|
| ~port: port
*/
def.static.setPort = function( port ) { _port = port; };

/*
| Time save password checking.
*/
def.static._checkValue =
	function( input, allowed )
{
	const autoReject = ( input.length !== allowed.length );
	if( autoReject )
	{
		// Prevent leaking length information by always making a comparison with the
		// same input when lengths don't match what we expect ...
		allowed = input;
	}
	const isMatch = crypto.timingSafeEqual( input, allowed );
	return !autoReject && isMatch;
};

/*
| A ssh client wants to authenticate.
|
| ~count: client counter
| ~ctx: ssh2 context
*/
def.static._sshAuth =
	function( count, ctx )
{
	if( ctx.method !== 'publickey' )
	{
		Log.debug( 'ssh', count, 'ctx.method not "publickey" but:', ctx.method );
		return ctx.reject( [ 'none', 'publickey' ] );
	}
	const username = ctx.username;
	const user = UserManager.get( username );
	if( !user )
	{
		Log.log( 'ssh', count, 'user "' + username + '" unknown' );
		return ctx.reject( [ 'publickey' ] );
	}

	const sshKeys = user.sshKeys;
	if( !sshKeys )
	{
		Log.log( 'ssh', count, 'user "' + username + '" has no ssh keys"' );
		return ctx.reject( [ 'publickey' ] );
	}

	let allowed = false;
	for( let sshKey of sshKeys )
	{
		if( ctx.key.algo !== sshKey.algorithm ) continue;
		const ssh2Parsed = sshKey.ssh2Parsed;
		if( !ssh2Parsed.getPublicSSH ) continue;
		if( !Self._checkValue( ctx.key.data, ssh2Parsed.getPublicSSH( ) ) ) continue;
		if( ctx.signature && ssh2Parsed.verify( ctx.blob, ctx.signature ) !== true ) continue;
		allowed = true;
		break;
	}
	if( !allowed )
	{
		Log.debug( 'user "' + username + '" has no valid ssh key' );
		return ctx.reject( [ 'publickey' ] );
	}
	this.user = user;
	ctx.accept( );
};

/*
| Starts the ssh server.
*/
def.static.start =
	async function( )
{
	Log.log( 'ssh', '*', 'starting' );
	if( !_hostKeys ) throw new Error( 'no ssh host keys provided' );

	const connected = ( client, info ) => {
		const count = Log.getCount( );
		let nextSubCount = 1;
		Log.log( 'ssh', count, 'client connected', info );
		client
		.on( 'authentication',
			function( ctx )
			{
				Self._sshAuth.call( this, count, ctx );
			}
		)
		.on( 'ready', ( ) => {
			Log.debug( 'ssh', count, 'client authenticated!' );
			client.on(
				'session',
				function( accept, reject )
				{
					Self._sshSession(
						count + ':' + nextSubCount++,
						this.user, accept, reject
					);
				}
			);
		} )
		.on( 'close', ( ) => {
			Log.log( 'ssh', count, 'client disconnected' );
		} )
		.on( 'error', ( err ) => {
			Log.log( 'ssh', count, 'client error', err );
			Log.log( 'ssh', count, 'client info', info );
		} );
	};

	const config = { hostKeys: _hostKeys };
	if( Log.debugging ) config.debug = Log.debug;

	for( let ip of _ips )
	{
		const server = new ssh2.Server( config, connected );
		server.listen(
			_port, ip, function( )
			{
				const address = this.address( );
				Log.log( 'ssh', '*', 'listening on ' + address.address + ':' + address.port );
			}
		);
	}
};

/*
| A ssh session.
|
| ~count: client counter
| ~user: authenticated user
| ~sessionAccept: ssh2 library accept call
| ~sessionReject: ssh2 library reject call
*/
def.static._sshSession =
	function( count, user, sessionAccept, sessionReject )
{
	const session = sessionAccept( );
	session.once( 'exec', ( accept, reject, info ) => {
		const command = info.command;
		if( command.substr( 0, 16 ) === 'git-upload-pack ' )
		{
			return(
				SshGit.serve(
					count,
					'git-upload-pack', command.substr( 16 ),
					user, accept, reject
				)
			);
		}
		else if( command.substr( 0, 17 ) === 'git-receive-pack ' )
		{
			return(
				SshGit.serve(
					count,
					'git-receive-pack', command.substr( 17 ),
					user, accept, reject
				)
			);
		}
		else if( command.substr( 0, 21 ) === 'git-lfs-authenticate ' )
		{
			if( !LfsManager.enabled( ) ) reject( );

			return(
				SshLfs.serve(
					count,
					'git-lfs-authenticate', command.substr( 21 ),
					user, accept, reject
				)
			);
		}
		else
		{
			Log.log( 'ssh', count, 'unsupported command', command );
			const stream = accept( );
			stream.exit( -1 );
			stream.end( );
			//reject( );
		}
	} );
};
