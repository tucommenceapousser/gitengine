/*
| Handles ajax requests.
*/
'use strict';

def.abstract = true;

const timers = require( 'timers/promises' );

const Log = tim.require( 'Log/Self' );
const RequestAuth = tim.require( 'Yagit/Request/Auth' );
const RequestLogin = tim.require( 'Yagit/Request/Login' );
const ReplyAuth = tim.require( 'Yagit/Reply/Auth' );
const ReplyLogin = tim.require( 'Yagit/Reply/Login' );
const ReplyError = tim.require( 'Yagit/Reply/Error' );
const SessionManager = tim.require( 'Yagit/Session/Manager' );
const UserManager = tim.require( 'User/Manager' );

/*
| Milliseconds to wait in case of wrong auth.
*/
const wrongWaitTime = 2000;

/*
| Handles an ajax request.
*/
def.static.handle =
	async function( json )
{
	switch( json.$type )
	{
		case 'RequestAuth': return await Self._handleAuth( json );
		case 'RequestLogin': return await Self._handleLogin( json );
		default: ReplyError.Message( 'invalid request' );
	}
};

/*
| Handles an auth request.
*/
def.static._handleAuth =
	async function( request )
{
	try{ request = RequestAuth.FromJson( request ); }
	catch( e ) { return ReplyError.Message( 'request json broken: ' + e ); }

	// FIXME pass request counts through timberman
	Log.log( 'yagit', '#', 'Auth for: ' + request.session );
	const session = SessionManager.getSession( request.session );
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
	async function( request )
{
	try{ request = RequestLogin.FromJson( request ); }
	catch( e ) { return ReplyError.Message( 'request json broken: ' + e ); }

	const username = request.username;
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
	const r = passhash.checkPassword( request.password );
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
	const session = await SessionManager.createSession( );

	return ReplyLogin.create( 'session', session );
};
