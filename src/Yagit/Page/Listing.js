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

	if( !listing || !listing.listing )
	{
		listing = Listing.create( );
		const pageListing = root.pageListing.create( 'listing', listing );
		root.create( 'pageListing', pageListing );
		listing.fetch( 'pageListing', 'onFetchListing' );
		return;
	}

	let divTop = document.getElementById( 'listingDivTop' );
	let divBottom;

	if( !divTop )
	{
		divTop = document.createElement( 'div' );
		divTop.id = 'listingDivTop';

		divBottom = document.createElement( 'div' );
		divBottom.id = 'listingDivBottom';

		document.body.replaceChildren( divTop, divBottom );
	}
	else
	{
		divTop.replaceChildren( );
		divBottom = document.getElementById( 'listingDivBottom' );
		divBottom.replaceChildren( );
	}

	const divRepoTable = document.createElement( 'div' );
	divRepoTable.id = 'repoTable';
	divBottom.appendChild( divRepoTable );

	let repoLines = [ ];
	{
		const divHeader = document.createElement( 'div' );
		divHeader.classList.add( 'header' );

		const divHeaderName = document.createElement( 'div' );
		divHeaderName.classList.add( 'name' );
		divHeaderName.textContent = 'Name';
		divHeader.appendChild( divHeaderName );

		const divHeaderDesc = document.createElement( 'div' );
		divHeaderDesc.classList.add( 'desc' );
		divHeaderDesc.textContent = 'Description';
		divHeader.appendChild( divHeaderDesc );

		repoLines.push( divHeader );
	}

	let stripe = 0;
	for( let repo of listing.listing )
	{
		const aRepoLine = document.createElement( 'a' );
		aRepoLine.classList.add( 'repoEntry', 'stripe' + stripe );
		aRepoLine.href = '#' + repo.name;
		stripe = ( stripe + 1 ) % 2;

		const divRepoName = document.createElement( 'div' );
		divRepoName.classList.add( 'name' );
		divRepoName.textContent = repo.name;
		aRepoLine.appendChild( divRepoName );

		const divRepoDesc = document.createElement( 'div' );
		divRepoDesc.classList.add( 'desc' );
		divRepoDesc.textContent = repo.description;
		aRepoLine.appendChild( divRepoDesc );

		repoLines.push( aRepoLine );
	}

	divRepoTable.replaceChildren.apply( divRepoTable, repoLines );
};
