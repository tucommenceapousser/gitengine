/*
| Handles session cookies
*/
'use strict';

def.abstract = true;

/*
| Gets the session cookie from a request
*/
def.static.handle =
	function( request )
{
	const headers = request.headers;
	let cookie = headers.cookie;
	let session;

	if( !Array.isArray( cookie ) ) cookie = cookie.split( ';' );

	if( Array.isArray( cookie ) )
	{
		for( let c of cookie )
		{
			session = Self._handleCookie( c.trim( ) );
			if( session ) return session;
		}
	}
};

/*
| Handles a cookie entry.
*/
def.static._handleCookie =
	function( cookie )
{
	if( !cookie ) return;
	const ioe = cookie.indexOf( '=' );
	if( ioe < 0 ) return;
	const name = cookie.substr( 0, ioe );
	const value = cookie.substr( ioe + 1 );

	if( name === 'session' ) return value;
};
