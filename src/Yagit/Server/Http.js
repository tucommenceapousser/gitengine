/*
| Handles all http(s) stuff.
*/
'use strict';

def.abstract = true;

//const fs = require( 'fs' );
const http = require( 'http' );
//const https = require( 'https' );
//const util = require( 'util' );

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

	// forwards http requests to https
	/*
	http
	.createServer(
		( req, res ) =>
	{
		res.writeHead( 307, { Location: 'https://data.csc.univie.ac.at/', } );
		res.end( 'go use https' );
	}
	).listen( 80 );
	*/

	http
	.createServer( handler )
	.listen( { port: 8080, host: '127.0.0.1'} );

	/*
	const httpsOptions =
	{
		key: fs.readFileSync( '/etc/ssl/data22/server.key' ),
		cert: fs.readFileSync( '/etc/ssl/data22/server.crt' )
	};
	const server = https.createServer( httpsOptions, handler );
	const listen = util.promisify( server.listen.bind( server ) );
	await listen( 443, null  );
	*/

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
