/*
| A file info.
*/
'use strict';

def.attributes =
{
	// file data
	data: { type: [ 'undefined', 'string', 'protean' ] },

	// path of the file dir
	// must be a non trailing slash path
	path: { type: 'Yagit/Path/Self' },

	// "text" or "binary"
	type: { type: 'string' }
};

/*
| Fetches the file from server.
|
| ~page: page to call on reply.
| ~on: function to call on reply.
| ~type: load "text" or "blob"
*/
def.proto.fetch =
	async function( page, on, type )
{
	const path = this.path;

/**/if( CHECK && path.slash ) throw new Error( );

	const url = this.url;
	const headers = { };
	const response = await fetch( url, { headers: headers } );

	let file;

	switch( type )
	{
		case 'blob':
		{
			const text = await response.text( );
			file = this.create( 'data', text );
			break;
		}

		case 'text':
		{
			const text = await response.text( );
			file = this.create( 'data', text );
			break;
		}

		default: throw new Error( );
	}

	root[ page ][ on ]( file, undefined );
};

/*
| All image extensions to show as images.
*/
def.staticLazy.imageExt = ( ) =>
	new Set( [
		'gif',
		'jpg',
		'jpeg',
		'png',
		'svg',
	] );

/*
| All image extensions to show as images.
*/
def.staticLazy.highlightExt = ( ) =>
	( {
		'bib'  : 'latex',
		'c'    : 'c',
		'cc'   : 'cpp',
		'cpp'  : 'cpp',
		'java' : 'java',
		'js'   : 'javascript',
		'lua'  : 'lua',
		'm'    : 'matlab',
		'php'  : 'php',
		'pl'   : 'perl',
		'py'   : 'python',
		'rp'   : 'ruby',
		'rs'   : 'rust',
		'tex'  : 'latex',
	} );

/*
| Prism highlighter to use.
*/
def.lazy.highlighter =
	function( )
{
	const path = this.path;
	const filename = path.get( path.length - 1 );
	const lcName = filename.toLowerCase( );

	switch( lcName )
	{
		case 'makefile': return 'makefile';
		// default go on
	}

	const iod = lcName.lastIndexOf( '.' );
	if( iod < 0 ) return false;
	const ext = lcName.substr( iod + 1 );

	const he = Self.highlightExt[ ext ];
	if( he ) return he;
	return false;
};

/*
| True if the path suggests this is an image.
*/
def.lazy.isImage =
	function( )
{
	const path = this.path;
	const filename = path.get( path.length - 1 );
	const lcName = filename.toLowerCase( );

	const iod = lcName.lastIndexOf( '.' );
	if( iod < 0 ) return false;
	const ext = lcName.substr( iod + 1 );

	return Self.imageExt.has( ext );
};

/*
| True if the path suggests this is a pdf file.
*/
def.lazy.isPdf =
	function( )
{
	const path = this.path;
	const filename = path.get( path.length - 1 );
	const lcName = filename.toLowerCase( );

	return lcName.endsWith( '.pdf' );
};

/*
| Url of the file.
*/
def.lazy.url =
	function( )
{
	return( '/file/' + this.path.string );
};
