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

const sockPath = '/var/run/gitengine/pre-receive';

/*
| Does the action.
*/
const action =
	async function( stream, parray )
{
	// tells the hook to return 0 error value
	// note: this can only be one char, '1' is valid, -1 would be not

	const path = parray[ 0 ];
	const env =
	Object.freeze( {
		GITENGINE_USER:                   parray[ 1 ],
		GIT_ALTERNATE_OBJECT_DIRECTORIES: parray[ 2 ],
		GIT_EXEC_PATH:                    parray[ 3 ],
		GIT_MERGE_AUTOEDIT:               parray[ 4 ],
		GIT_OBJECT_DIRECTORY:             parray[ 5 ],
		GIT_PUSH_OPTION_COUNT:            parray[ 6 ],
		GIT_QUARANTINE_PATH:              parray[ 7 ],
	} );
	const stdin = parray[ 8 ];
	const result = await RepositoryManager.onPreReceive( path, env, stdin );

	//console.log( 'XXX', env );
	//console.log( 'XXX', stdin );

	// writes the result
	stream.write( result );

	// writes a zero to end the result
	stream.write( Buffer.alloc( 1 ) );

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
	// previous zero
	let dp = 0;

	const result = [ ];
	for( let d = 0, dlen = data.length; d < dlen; d++ )
	{
		if( data.charCodeAt( d ) === 0 )
		{
			result.push( data.substring( dp, d ) );
			if( result.length >= 9 ) return result;
			dp = d + 1;
		}
	}

	return undefined;
};

/*
| A plug connected to the sock.
*/
function _connected( stream )
{
	let data = '';
	stream.on(
		'data',
		( chunk ) =>
		{
			if( data === undefined ) return;
			data += chunk;
			const parray = parse( data );
			if( parray )
			{
				data = undefined;
				action( stream, parray );
			}
		}
	);
}

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
	net.createServer( _connected ).listen( sockPath );
	process.umask( umask );
};
