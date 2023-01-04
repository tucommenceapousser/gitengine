/*
| Handles ajax requests.
*/
'use strict';

def.abstract = true;

const timers = require( 'timers/promises' );

const Log = tim.require( 'Log/Self' );
const RequestLogin = tim.require( 'Yagit/Request/Login' );
const ReplyLogin = tim.require( 'Yagit/Reply/Login' );
const ReplyError = tim.require( 'Yagit/Reply/Error' );
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
		case 'RequestLogin': return await Self._handleLogin( json );
		default: ReplyError.Message( 'invalid request' );
	}
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

	return ReplyLogin.create( 'session', 'muhkuh' );
};
