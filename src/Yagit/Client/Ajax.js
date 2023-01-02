/*
| Handles ajax requests to the server.
*/
'use strict';

def.abstract = true;

/*
| Sets off an ajax request.
|
| ~request: the request to send
| ~page:    the page to call
| ~on:      the pages on* function to call
*/
def.static.request =
	function( request, page, on )
{
	const xhr = new XMLHttpRequest( );
	xhr.open( 'POST', '/ajax', true );
	xhr.setRequestHeader( 'Content-type', 'application/x-www-form-urlencoded' );
	const rs = JSON.stringify( request );
	xhr.onreadystatechange =
		function( )
	{
		let reply;
		if( this.readyState !== 4 ) return;
		if( this.status === 0 ) return;

		try
		{
			if( this.status !== 200 )
			{
				throw new Error( 'status !== 200: ' + this.status );
			}
			reply = JSON.parse( this.responseText );
		}
		catch( e )
		{
			console.log( this.responseText );
			console.log( e );
			root.error(
				'Communication error with server! If you internet works,'
				+ ' please tell Axel about this to fix it.'
			);
			return;
		}
		root[ page ][ on ]( request, reply );
	};
	xhr.send( rs );
};
