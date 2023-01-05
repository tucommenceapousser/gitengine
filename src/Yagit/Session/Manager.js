/*
| Manages sessions.
*/
'use strict';

def.abstract = true;

const fs = require( 'fs/promises' );

const Log = tim.require( 'Log/Self' );
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

	const session =
		Session.create(
			'username', username, 'created',
			Date.now( )
		);

	Log.log( 'yagit', '#', 'creating session ' + key + ' for ' + username );
	_sessions = _sessions.set( key, session );
	await Self._save( );
	return key;
};

/*
| Destroys a session.
*/
def.static.destroySession =
	async function( key )
{
	Log.log( 'yagit', '#', 'destroying session ' + key );
	_sessions = _sessions.remove( key );
	await Self._save( );
};

/*
| Returns a session by its key
*/
def.static.getSession =
	function( key )
{
	return _sessions.get( key );
};

/*
| Initializes the session manager.
*/
def.static.init =
	async function( )
{
	// already initialized?
	if( _semaphore ) throw new Error( );

	_semaphore = Semaphore.create( );

	try
	{
		let fileData = await fs.readFile( sessionsFilename );
		fileData = fileData + '';
		const json = JSON.parse( fileData );
		_sessions = SessionGroup.FromJson( json );
		Log.log( 'yagit', '#', 'loaded SessionManager' );
	}
	catch( e )
	{
		console.log( e );
		_sessions = SessionGroup.create( );
		Log.log( 'yagit', '#', 'resetting SessionManager' );
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
