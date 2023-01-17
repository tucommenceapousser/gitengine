/*
| Handles ajax requests.
*/
'use strict';

def.abstract = true;

const timers = require( 'timers/promises' );

const Cookie = tim.require( 'Yagit/Server/Cookie' );
const Https = tim.require( 'Https/Self' );
const Log = tim.require( 'Log/Self' );
const RequestAuth = tim.require( 'Yagit/Request/Auth' );
const RequestLogin = tim.require( 'Yagit/Request/Login' );
const RequestLogout = tim.require( 'Yagit/Request/Logout' );
const ReplyAuth = tim.require( 'Yagit/Reply/Auth' );
const ReplyLogin = tim.require( 'Yagit/Reply/Login' );
const ReplyLogout = tim.require( 'Yagit/Reply/Logout' );
const ReplyError = tim.require( 'Yagit/Reply/Error' );
const SessionManager = tim.require( 'Yagit/Session/Manager' );
const UserManager = tim.require( 'User/Manager' );

/*
| Milliseconds to wait in case of wrong auth.
*/
const wrongWaitTime = 2000;

/*
| Handles ajax requests.
|
| ~request:  the https request
| ~result:   the https result
| ~path:     the https url path
*/
def.static.handle =
	function( request, result, path )
{
	if( request.method !== 'POST' )
	{
		Https.error( result, 400, 'Must use POST' );
		return;
	}

	const data = [ ];
	//request.on( 'close', ( ) => { resource.ajax( 'close', undefined, result ); } );
	request.on( 'data', ( chunk ) => { data.push( chunk ); } );

	const handler =
		async function( )
	{
		const query = data.join( '' );
		let json;

		try{ json = JSON.parse( query ); }
		catch( err ) { Https.error( result, 400, 'Not valid JSON' ); return; }

		const asw = await Self._ajax( request, json );
		if( !asw ) return;

		const headers =
		{
			'Content-Type': 'application/json',
			'Cache-Control': 'no-cache',
			'Date': new Date().toUTCString()
		};

		switch( asw.timtype )
		{
			case ReplyLogin:
			{
				const de = new Date( );
				de.setFullYear( de.getFullYear( ) + 10 );
				headers[ 'Set-Cookie' ] =
					'session=' + asw.session
					+ '; Expires=' + de.toUTCString( );
				break;
			}

			case ReplyLogout:
			{
				const de = new Date( );
				de.setFullYear( de.getFullYear( ) + 10 );
				headers[ 'Set-Cookie' ] =
					'session=deleted; expires=Thu, 01 Jan 1970 00:00:00 GMT';
				break;
			}

			// default ignore
		}

		result.writeHead( 200, headers );
		result.end( asw.jsonfy( ) );
	};

	request.on(
		'end',
		( ) => handler( ).catch( ( error ) => { console.error( error ); process.exit( -1 ); } )
	);
};

/*
| Handles an ajax request.
*/
def.static._ajax =
	async function( request, json )
{
	switch( json.$type )
	{
		case 'RequestAuth': return await Self._handleAuth( request, json );
		case 'RequestLogin': return await Self._handleLogin( request, json );
		case 'RequestLogout': return await Self._handleLogout( request, json );
		default: ReplyError.Message( 'invalid request' );
	}
};

/*
| Handles an auth request.
*/
def.static._handleAuth =
	async function( request, json )
{
	try{ json = RequestAuth.FromJson( json ); }
	catch( e ) { return ReplyError.Message( 'request json broken: ' + e ); }

	let session = Cookie.handle( request );
	if( !session )
	{
		Log.log( 'yagit', '#', 'session missing.' );
		return ReplyError.Message( 'invalid session' );
	}

	// FIXME pass request counts through timberman
	session = SessionManager.getSession( session );
	if( !session )
	{
		await timers.setTimeout( wrongWaitTime );
		Log.log( 'yagit', '#', 'session unknown.' );
		return ReplyError.Message( 'invalid session' );
	}

	const user = UserManager.get( session.username );
	if( !user )
	{
		await timers.setTimeout( wrongWaitTime );
		Log.log( 'yagit', '#', 'session has invalid username.' );
		return ReplyError.Message( 'invalid session' );
	}

	return ReplyAuth.create( 'username', session.username );
};

/*
| Handles a login request.
*/
def.static._handleLogin =
	async function( request, json )
{
	try{ json = RequestLogin.FromJson( json ); }
	catch( e ) { return ReplyError.Message( 'request json broken: ' + e ); }

	const username = json.username;
	// FIXME pass request counts through timberman
	Log.log( 'yagit', '#', 'Login for: ' + username );
	const user = UserManager.get( username );
	if( !user )
	{
		await timers.setTimeout( wrongWaitTime );
		Log.log( 'yagit', '#', 'user unknown.' );
		return ReplyError.Message( 'invalid credentials' );
	}

	const passhash = user.passhash;
	const r = passhash.checkPassword( json.password );
	if( r === undefined )
	{
		Log.log( 'yagit', '#', 'auth user has no passhash' );
		await timers.setTimeout( wrongWaitTime );
		return ReplyError.Message( 'invalid credentials' );
	}
	if( !r )
	{
		Log.log( 'yagit', '#', 'auth wrong password' );
		await timers.setTimeout( wrongWaitTime );
		return ReplyError.Message( 'invalid credentials' );
	}
	Log.log( 'yagit', '#', 'auth OK' );
	const session = await SessionManager.createSession( username );

	return ReplyLogin.create( 'session', session );
};

/*
| Handles a logout request.
*/
def.static._handleLogout =
	async function( request, json )
{
	try{ json = RequestLogout.FromJson( json ); }
	catch( e ) { return ReplyError.Message( 'request json broken: ' + e ); }

	const sessionKey = Cookie.handle( request );
	if( !sessionKey )
	{
		Log.log( 'yagit', '#', 'session missing.' );
		return ReplyError.Message( 'invalid session' );
	}

	// FIXME pass request counts through timberman
	const session = SessionManager.getSession( sessionKey );
	if( !session )
	{
		await timers.setTimeout( wrongWaitTime );
		Log.log( 'yagit', '#', 'session unknown.' );
		return ReplyError.Message( 'invalid session' );
	}

	await SessionManager.destroySession( sessionKey );

	return ReplyLogout.singleton;
};

