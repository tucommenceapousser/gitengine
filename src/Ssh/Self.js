/*
| Provides the ssh interface.
*/

def.abstract = true;

const crypto = require( 'crypto' );
const fs_ = require( 'fs' );
const fs = fs_.promises;
const ssh2 = require( 'ssh2' );

const LfsManager = tim.require( 'GitEngine/Lfs/Manager' );
const Log = tim.require( 'GitEngine/Ssh/Log' );
const SshGit = tim.require( 'GitEngine/Ssh/Git' );
const SshLfs = tim.require( 'GitEngine/Ssh/Lfs' );
const UserManager = tim.require( 'GitEngine/User/Manager' );

/*
| Configured ips.
*/
let _ips = [ '0.0.0.0' ];

/*
| Port to listen to.
*/
let _port = 22;

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
*/
def.static._sshAuth =
	function( ctx )
{
	if( ctx.method !== 'publickey' )
	{
		Log.debug( 'ctx.method not "publickey" but:', ctx.method );
		return ctx.reject( [ 'none', 'publickey' ] );
	}
	const username = ctx.username;
	const user = UserManager.get( username );
	if( !user )
	{
		Log.debug( 'user "' + username + '" unknown' );
		return ctx.reject( [ 'publickey' ] );
	}

	const sshKeys = user.sshKeys;
	if( !sshKeys )
	{
		Log.debug( 'user "' + username + '" has now ssh keys"' );
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
	Log.both( 'starting ssh git backend' );
	const hostKey_rsa = await fs.readFile( '/home/git/ssh/ssh_host_rsa_key' );
	const hostKey_ed25519 = await fs.readFile( '/home/git/ssh/ssh_host_ed25519_key' );
	const hostKey_ecdsa = await fs.readFile( '/home/git/ssh/ssh_host_ecdsa_key' );
	const hostKeys = [ hostKey_ecdsa, hostKey_ed25519, hostKey_rsa ];
	const connected = ( client, info ) => {
		Log.log( 'ssh client connected', info );
		client
		.on( 'authentication', Self._sshAuth )
		.on( 'ready', ( ) => {
			Log.debug( 'ssh client authenticated!' );
			client.on( 'session', Self._sshSession );
		} )
		.on( 'close', ( ) => {
			Log.log( 'ssh client disconnected', info );
		} )
		.on( 'error', ( err ) => {
			Log.log( 'ssh client error', err );
			Log.log( 'ssh client info', info );
		} );
	};

	const config = { hostKeys: hostKeys };
	if( Log.debugging ) config.debug = Log.debug;

	for( let ip of _ips )
	{
		const server = new ssh2.Server( config, connected );
		server.listen(
			_port, ip, function( )
			{
				const address = this.address( );
				Log.both( 'ssh listening on ' + address.address + ':' + address.port );
			}
		);
	}
};

/*
| A ssh session
*/
def.static._sshSession =
	function( accept, reject )
{
	const session = accept( );
	session.once( 'exec', ( accept, reject, info ) => {
		const command = info.command;
		console.log( 'COMMAND', command );
		if( command.substr( 0, 16 ) === 'git-upload-pack ' )
		{
			return(
				SshGit.serve( 'git-upload-pack', command.substr( 16 ), this, accept, reject )
			);
		}
		else if( command.substr( 0, 17 ) === 'git-receive-pack ' )
		{
			return(
				SshGit.serve( 'git-receive-pack', command.substr( 17 ), this, accept, reject )
			);
		}
		else if( command.substr( 0, 21 ) === 'git-lfs-authenticate ' )
		{
			if( !LfsManager.enabled( ) ) reject( );
			return(
				SshLfs.serve( 'git-lfs-authenticate', command.substr( 21 ), this, accept, reject )
			);
		}
		//experimental interface to git-as-svn currently disabled
		//else if( command.substr( 0, 8 ) === 'svnserve' )
		//{
		//	return svnServe( this, accept, reject, info );
		//}
		else
		{
			reject( );
		}
	} );
};

