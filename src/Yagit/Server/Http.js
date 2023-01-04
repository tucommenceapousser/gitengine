/*
| Handles all http(s) stuff.
*/
'use strict';

def.abstract = true;

const http = require( 'http' );

/*
| Starts the http(s) server.
*/
def.static.startup =
	async function( )
{
	const handler =
		( request, result ) =>
	{
		root.timberman.requestListener( request, result )
		.catch( ( error ) => { console.error( error ); process.exit( -1 ); } );
	};

	http
	.createServer( handler )
	.listen( { port: 8080, host: '127.0.0.1'} );

	console.log( 'https running' );
};

/*
| Logs and returns a web error.
*/
def.static.webError =
	function( result, code, message )
{
	result.writeHead(
		code,
		{
			'content-type': 'text/plain',
			'cache-control': 'no-cache',
			'date': new Date().toUTCString()
		}
	);
	message = code + ' ' + message;
	this.log && this.log( 'web error', code, message );
	result.end( message );
};
