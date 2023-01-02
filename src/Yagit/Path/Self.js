/*
| A path in the yagit.
|
| This is only directory entries. No filename.
*/
'use strict';

def.attributes =
{
	// the path parts
	parts: { type: 'tim:string/list' }
};

const StringList = tim.require( 'tim:string/list' );

/*
| Returns a Path with another dir.
*/
def.lazyFunc.append =
	function( dir )
{
	return this.create( 'parts', this.parts.append( dir ) );
};

/*
| Shortcut to length of the parts.
*/
def.lazy.length = function( ) { return this.parts.length; };

/*
| Shortens the path.
*/
def.lazy.shorten =
	function( )
{
	const parts = this.parts;
	return this.create( 'parts', parts.remove( parts.length - 1 ) );
};

/*
| Truncates the path to l parts.
*/
def.lazyFunc.truncate =
	function( l )
{
	const parts = this.parts;
	return this.create( 'parts', parts.slice( 0, l ) );
};

/*
| Creates the path from a string.
*/
def.static.String =
	function( path )
{
	const parts = path.split( '/' );
	const list = [ ];

	for( let pp of parts )
	{
		if( pp !== '' ) list.push( pp );
	}

	return Self.create( 'parts', StringList.Array( list ) );
};

/*
| The path as string.
*/
def.lazy.string =
	function( )
{
	const parts = this.parts;
	if( parts.length === 0 ) return '/';
	return parts.join( '/' );
};
