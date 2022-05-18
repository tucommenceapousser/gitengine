/*
| Promised exec.
*/
'use strict';

def.abstract = true;

const child = require( 'child_process' );

/*
| Executes a command and returns stdout/stderr.
*/
def.static.exec = ( command, options ) =>
	new Promise( ( resolve, reject ) =>
	{
		child.exec( command, options, ( error, stdout, stderr ) =>
		{
			stdout += ''; stderr += '';
			if( options && options.echo )
			{
				console.log( stdout );
				console.log( stderr );
			}
			if( error ) reject( { error: error, out : stdout, err : stderr } );
			else resolve( { out : stdout, err : stderr } );
		} );
	} );

/*
| Executes a file and returns stdout/stderr.
*/
def.static.file = ( command, args, options ) =>
	new Promise( ( resolve, reject ) =>
	{
		child.execFile( command, args, options, ( error, stdout, stderr ) =>
		{
			stdout += ''; stderr += '';
			if( options && options.echo )
			{
				console.log( stdout );
				console.log( stderr );
			}
			if( error ) reject( { error: error, out : stdout, err : stderr } );
			else resolve( { out : stdout, err : stderr } );
		} );
	} );
