/*
| A path in the yagit.
|
| This is only directory entries. No filename.
*/
'use strict';

def.attributes =
{
	// true if the path has a slash / is a dir
	slash: { type: 'boolean' },

	// the path parts
	parts: { type: 'tim:string/list' },
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
| Returns a Path with a file appended.
*/
def.lazyFunc.appendFile =
	function( filename )
{
	const parts = this.parts;

	if( parts.length === 0 )
	{
		return this.create( 'parts', parts.append( filename ), 'slash', false );
	}

	// can only append files to dir paths
	if( !this.slash ) throw new Error( );

	return this.create( 'parts', this.parts.append( filename ), 'slash', false );
};

/*
| Chops of first part.
*/
def.lazy.chop =
	function( )
{
	const parts = this.parts;
	return this.create( 'parts', parts.remove( 0 ) );
};

/*
| Chops of leading n parts.
*/
def.lazyFunc.chopn =
	function( n )
{
	const parts = this.parts;
	return this.create( 'parts', parts.slice( n, parts.length ) );
};

/*
| Creates an empty place.
*/
def.staticLazy.Empty =
	function( s )
{
	return Self.create( 'parts', StringList.Empty, 'slash', false );
};

/*
| Returns the n-th part.
*/
def.proto.get =
	function( n )
{
	return this.parts.get( n );
};

/*
| Shortcut to length of the parts.
*/
def.lazy.length =
	function( )
{
	return this.parts.length;
};

/*
| Sets a part
*/
def.proto.set =
	function( i, part )
{
	const parts = this.parts;
	return this.create( 'parts', parts.set( i, part ) );
};

/*
| Shortens the path.
*/
def.lazy.shorten =
	function( )
{
	const parts = this.parts;
	return(
		this.create(
			'parts', parts.remove( parts.length - 1 ),
			'slash', true,
		)
	);
};

/*
| Truncates the path to l parts.
*/
def.lazyFunc.truncate =
	function( l )
{
	const parts = this.parts;
	if( l < parts.length )
	{
		return this.create( 'parts', parts.slice( 0, l ), 'slash', true );
	}
	else
	{
		return this.create( 'parts', parts.slice( 0, l ) );
	}
};

/*
| Creates the path from a string.
*/
def.static.String =
	function( s )
{
	const parts = s.split( '/' );
	const list = [ ];

	for( let pp of parts )
	{
		if( pp !== '' ) list.push( pp );
	}

	const slash = parts[ parts.length - 1 ] === '';

	return Self.create( 'parts', StringList.Array( list ), 'slash', slash );
};

/*
| The path as string.
*/
def.lazy.string =
	function( )
{
	const parts = this.parts;
	if( parts.length === 0 ) return this.slash ? '/' : '';
	return parts.join( '/' ) + ( this.slash ? '/' : '' );
};
