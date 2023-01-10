/*
| Lists all repositories available to the user.
*/
'use strict';

def.attributes =
{
	// repository branches information
	listing: { type: [ 'undefined', 'Yagit/Client/Listing' ] },

	// the place the page was created for
	place: { type: 'Yagit/Client/Place' },

	// currently logged in user
	username: { type: 'string' },
};

const Listing = tim.require( 'Yagit/Client/Listing' );

/*
| Received a fetch listing reply.
*/
def.proto.onFetchListing =
	function( listing, error )
{
	if( error ) return root.error( error );

	const pageListing = root.pageListing.create( 'listing', listing );
	pageListing.show( );
};

/*
| Shows the page in body
*/
def.proto.show =
	function( )
{
	let listing = this.listing;

	if( !listing )
	{
		listing = Listing.create( );
		const pageListing = root.pageListing.create( 'listing', listing );
		root.create( 'pageListing', pageListing );
		listing.fetch( 'pageListing', 'onFetchListing' );
		return;
	}

	let divTop = document.getElementById( 'divTop' );
	let divBottom;

	if( !divTop )
	{
		divTop = document.createElement( 'div' );
		divTop.id = 'divTop';

		divBottom = document.createElement( 'div' );
		divBottom.id = 'divBottom';

		document.body.replaceChildren( divTop, divBottom );
	}
	else
	{
		divTop.replaceChildren( );
		divBottom = document.getElementById( 'divBottom' );
		divBottom.replaceChildren( );
	}

	/*
	{
		// divPanelButtons
		const divPanelButtons = document.createElement( 'div' );
		divTop.appendChild( divPanelButtons );
		divPanelButtons.id = 'divPanelButtons';

		const linkHistory = document.createElement( 'a' );
		divPanelButtons.appendChild( linkHistory );
		linkHistory.id = 'linkHistory';
		linkHistory.textContent = '⌚';
		linkHistory.title = 'history';

		linkHistory.href =
			Place.PageOptions(
				repository,
				'path', path.truncate( 0 ).string,
				'view', 'history',
			).hash;
	}
	*/

	console.log( listing.listing );

	let text = '';
	for( let repo of listing.listing )
	{
		text += repo.name;
		text += '\n';
	}

	divBottom.textContent = text;
};
