/*
| A file info.
*/
'use strict';

def.attributes =
{
	// commit sha to query for
	commitSha: { type: 'string' },

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
	const response = await fetch( url );

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
def.staticLazy.imageExt =
	( ) => new Set( [
		'gif',
		'jpg',
		'jpeg',
		'png',
		'svg',
	] );

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
	const path = this.path;
	return(
		'/file/'
		+ path.get( 0 ) + '/'
		+ this.commitSha + '/'
		+ path.chop.string
	);
};
