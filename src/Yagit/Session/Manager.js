/*
| Manages sessions.
*/
'use strict';

def.attributes =
{

};

const fs = require( 'fs/promises' );

const Semaphore = tim.require( 'Util/Semaphore' );
const Session = tim.require( 'Yagit/Session/Self' );
const SessionGroup = tim.require( 'Yagit/Session/Group' );

const sessionsFilename = './sessions.json';
const sessionKeyLength = 50;

/*
| Session manager semaphore.
*/
let _semaphore;

/*
| The sessions.
*/
let _sessions;

/*
| Returns a random string of 'length'.
*/
const randomString =
	function( length )
{
	const ch = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const ua = [ ];
	for( let a = 0; a < length; a++ )
	{
		ua.push( ch[ Math.floor( ch.length * Math.random( ) ) ] );
	}
	return ua.join( '' );
};

/*
| Creates a new session for 'username'
*/
def.static.createSession =
	async function( username )
{
	let key;
	do { key = randomString( sessionKeyLength ); }
	while( _sessions.get( key ) );

	const session = Session.create( 'username', username, 'created', Date.now( ) );
	Log.log( 'session', '#', key + ' for ' + username );
	_sessions = _sessions.set( key, session )
	await Self._save( );
	return key;
};

/*
| Destroys a session.
*/
def.proto.destroySession =
	async function( key )
{
	console.log( 'destroying session', key );
	root.create(
		'sessionNexus',
			root.sessionNexus.create(
				'_sessions', root.sessionNexus._sessions.remove( key )
			)
	);
	await root.sessionNexus._save( );
};

/*
| Returns a session by its key
*/
def.proto.getSession = function( key ) { return root.sessionNexus._sessions.get( key ); };

/*
| Creates a sessionNexus by loading it from file.
| Or a new one if not available
*/
def.static.createLoading =
	async function( )
{
	try
	{
		let fileData = await fs.readFile( sessionsFilename );
		fileData = fileData + '';
		const json = JSON.parse( fileData );
		const sg = SessionGroup.FromJson( json );
		console.log( 'sessionNexus loaded' );
		return Self.create( 'semaphore', Semaphore.create( ), '_sessions', sg );
	}
	catch( e )
	{
		console.log( e );
		console.log( 'sessionNexus reset' );
		const sg = SessionGroup.create( );
		return Self.create( 'semaphore', Semaphore.create( ), '_sessions', sg );
	}
};

/*
| Writes the sessions to disk.
*/
def.static._save =
	async function( )
{
	const flag = await _semaphore.request( );
	await fs.writeFile( sessionsFilename, _sessions.jsonfy( '  ' ) );
	_semaphore.release( flag );
};
