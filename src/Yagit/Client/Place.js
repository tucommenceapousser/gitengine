/*
| A place is a page with options.
*/
'use strict';

def.attributes =
{
	// the path
	path: { type: 'Yagit/Path/Self' },

	options: { type: 'tim:string/group' },
};

const Path = tim.require( 'Yagit/Path/Self' );
const StringGroup = tim.require( 'tim:string/group' );

/*
| Turns this place into a hash value.
*/
def.lazy.hash =
	function( )
{
	const path = this.path;
	const options = this.options;

	if( path.length === 0 && options.size === 0 ) return '#';

	let hash = '#' + this.path.string;
	for( let key of options.keys ) hash += '&' + key + '=' + options.get( key );
	return encodeURI( hash );
};

/*
| The empty place.
*/
def.staticLazy.Empty =
	function( )
{
	return Self.create( 'path', Path.Empty, 'options', StringGroup.Empty );
};

/*
| Creates a place from an url.
*/
def.static.FromURL =
	function( url )
{
	url = decodeURI( url );
	let hash = url.match( /^[^#]*#(.*)$/ );
	if( !hash ) return Self.Empty;

	hash = hash[ 1 ];
	if( !hash ) return Self.Empty;

	const options = { };
	let lia = hash.lastIndexOf( '&' );

	while( lia >= 0 )
	{
		const keyval = hash.substr( lia + 1 );
		const ie = keyval.indexOf( '=' );
		const key = keyval.substr( 0, ie );
		if( options[ key ] ) continue;
		options[ keyval.substr( 0, ie ) ] = keyval.substr( ie + 1 );
		hash = hash.substr( 0, lia );
		lia = hash.lastIndexOf( '&' );
	}

	let path = Path.String( hash );

	// forces slash on repository root view
	if( path.length === 1 && !path.slash ) path = path.create( 'slash', true );

	return Self.create( 'path', path, 'options', StringGroup.Table( options ) );
};

/*
| Creates a place without options.
*/
def.static.Path =
	function( path )
{
	return Self.create( 'path', path, 'options', StringGroup.Empty );
};

/*
| Creates a place from page and paired options.
*/
def.static.PathOptions =
	function( path, ...options )
{
	const table = { };
	for( let a = 0, alen = options.length; a < alen; a+= 2 )
	{
		table[ options[ a ] ] = options[ a + 1 ];
	}
	return Self.create( 'path', path, 'options', StringGroup.Table( table ) );
};

/*
| Removes an option.
*/
def.proto.removeOption = function( key )
{
	return this.create( 'options', this.options.remove( key ) );
};

/*
| Sets an option.
*/
def.proto.setOption =
	function( key, value )
{
	return this.create( 'options', this.options.set( key, value ) );
};

/*
| Sets many options.
|
| ~kvps: key value pairs
*/
def.proto.setOptions =
	function( ...kvps )
{
	let options = this.options;
	for( let a = 0, alen = kvps.length; a < alen; a+= 2 )
	{
		options = options.set( kvps[ a ], kvps[ a + 1 ] );
	}
	return this.create( 'options', options );
};
