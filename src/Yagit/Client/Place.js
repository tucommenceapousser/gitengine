/*
| A place is a page with options.
*/
'use strict';

def.attributes =
{
	// the page
	page: { type: 'string' },

	options: { type: 'tim:string/group' },
};

const StringGroup = tim.require( 'tim:string/group' );

/*
| Turns this place into a hash value.
*/
def.lazy.hash =
	function( )
{
	let hash = '#' + this.page;
	const options = this.options;
	for( let key of options.keys ) hash += '&' + key + '=' + options.get( key );
	return encodeURI( hash );
};

/*
| Creates a place from an url.
*/
def.static.FromURL =
	function( url )
{
	url = decodeURI( url );
	let hash = url.match( /^[^#]*#(.*)$/ );
	if( !hash ) return;

	hash = hash[ 1 ];
	if( !hash ) return;

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

	return Self.create( 'page', hash, 'options', StringGroup.Table( options ) );
};

/*
| Creates a place without options.
*/
def.static.Page =
	function( page )
{
	return Self.create( 'page', page, 'options', StringGroup.Empty );
};

/*
| Creates a place from page and paired options.
*/
def.static.PageOptions =
	function( page, ...options )
{
	const table = { };
	for( let a = 0, alen = options.length; a < alen; a+= 2 )
	{
		table[ options[ a ] ] = options[ a + 1 ];
	}
	return Self.create( 'page', page, 'options', StringGroup.Table( table ) );
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
