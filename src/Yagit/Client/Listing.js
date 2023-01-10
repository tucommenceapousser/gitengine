/*
| Listing info about all available repositories.
*/
'use strict';

def.attributes =
{
	// the listing
	listing: { type: [ 'undefined', 'Yagit/Listing/Self' ] },
};

const ReplyListing = tim.require( 'Yagit/Reply/Listing' );

/*
| Fetches the dir from server.
|
| ~page: page to call on reply.
| ~on: function to call on reply.
*/
def.proto.fetch =
	async function( page, on )
{
	let url = '/listing';
	const response = await fetch( url, { headers: { 'x-session': root.session } } );
	if( !response.ok )
	{
		const text = await response.text( );
		root[ page ][ on ]( undefined, text );
		return;
	}

	const text = await response.text( );
	const reply = ReplyListing.FromJson( JSON.parse( text ) );
	let listing = this.create( 'listing', reply.listing );

	root[ page ][ on ]( listing, undefined );
};

