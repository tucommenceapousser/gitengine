/*
| Provides the unix domain socket for git hooks to report to.
|
i| And forwards notifications to repository manager.
*/
'use strict';

def.abstract = true;

import fs from 'fs';
import net from 'net';
import process from 'process';

import { Self as RepositoryManager } from '{Repository/Manager}';

const sockPath = '/var/run/gitengine/post-receive';

/*
| Does the action.
*/
const action =
	function( stream, path )
{
	// tells the hook to return 0 error value
	// note: this can only be one char, '1' is valid, -1 would be not
	stream.write( '0' );
	RepositoryManager.onPostReceive( path );
	stream.end( );
};

/*
| Tries to parse data.
|
| If it isn't complete yet, returns undefined
| to be recalled with more data.
|
| The plug provides a string with 4 arguments,
| alternating between a number for the length of the following
| argument and the argument.
*/
const parse =
	function( data )
{
	let ios = data.indexOf( ' ' );
	if( ios < 0 ) return;
	let len = parseInt( data, 10 );
	data = data.substr( ios + 1 );

	// length/data pairs of repository id
	if( data.length < len ) return;
	return data.substr( 0, len );
};

/*
| A plug connected to the sock.
*/
def.static._connected =
	function( stream )
{
	let data = '';
	stream.on(
		'data',
		( chunk ) =>
		{
			data += chunk;
			const path = parse( data );
			if( path ) action( stream, path );
		}
	);
};

/*
| Opens the sock for plugs to connect to.
|
| FIXME async/await
*/
def.static.open =
	function( )
{
	// tries to unlink any old sock
	// just to sure its not still in a timeout
	// from a previous run.
	try{ fs.unlinkSync( sockPath ); }
	catch( e ) { } // pass

	// temporarily changing the umask
	// so everything on the 'svn' host may write into that socket
	const umask = process.umask( );
	process.umask( 0 );
	net.createServer( Self._connected ).listen( sockPath );
	process.umask( umask );
};
