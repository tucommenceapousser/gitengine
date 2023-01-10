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

	// path of the file fir
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

	const url =
		'/file/'
		+ path.get( 0 ) + '/'
		+ this.commitSha + '/'
		+ path.chop.string;

	const response = await fetch( url, { headers: { 'x-session': root.session } } );

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
| True if the path suggests this is an image.
*/
def.lazy.isImage =
	function( )
{
	const path = this.path;
	const filename = path.get( path.length - 1 );
	const lcName = filename.toLowerCase( );

	// FIXME extract extension and switch{ }
	if( lcName.endsWith( '.gif' ) ) return true;
	if( lcName.endsWith( '.jpg' ) ) return true;
	if( lcName.endsWith( '.jpeg' ) ) return true;
	if( lcName.endsWith( '.png' ) ) return true;

	return false;
}
