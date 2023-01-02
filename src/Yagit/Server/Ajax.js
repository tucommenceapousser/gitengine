/*
| Handles ajax requests.
*/
'use strict';

def.abstract = true;

const ReplyError = tim.require( 'Yagit/Reply/Error' );

/*
| Handles an ajax request.
*/
def.static.handle =
	async function( json )
{
	console.log( 'AJAX', json );
	//let session;

	// checks session
	/*
	if( json.$type !== 'RequestLogin' )
	{
		if( !json.session ) return ReplyError.Message( 'no session' );
		session = root.sessionNexus.getSession( json.session );
		if( !session )
		{
			await timers.setTimeout( 800 );
			return ReplyError.Message( 'invalid session' );
		}

		// checks if the user still has access to login
		pd = root.cscdata.persons.get( session.username );
		if( !pd || !pd.permissions.data )
		{
			await timers.setTimeout( 800 );
			return ReplyError.Message( 'invalid session' );
		}
	}
	*/

	switch( json.$type )
	{
		default: ReplyError.Message( 'invalid request' );
	}
};
