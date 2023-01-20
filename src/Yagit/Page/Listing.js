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
const Top = tim.require( 'Yagit/Page/Top' );

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

	const body = document.body;
	let divTop = document.getElementById( 'divTop' );
	let divBottom;

	if( !divTop || !body.classList.contains( 'pageListing' ) )
	{
		divTop =
			Top.div(
				divTop, this.username, this.place.path,
				undefined, undefined, undefined, undefined, false
			);

		divBottom = document.createElement( 'div' );
		divBottom.id = 'divBottom';

		body.replaceChildren( divTop, divBottom );
		body.className = 'pageListing';
	}
	else
	{
		divTop =
			Top.div(
				divTop, this.username, this.place.path,
				undefined, undefined, undefined, undefined, false
			);

		divBottom = document.getElementById( 'divBottom' );
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
	let list = [ ];

	for( let repo of listing.listing )
	{
		list.push( repo.name );
	}

	list.sort(
		( a, b ) => a.localeCompare( b, undefined, { sensitivity: 'base' } )
	);

	for( let name of list )
	{
		const repo = listing.listing.get( name );

		const aRepoLine = document.createElement( 'a' );
		aRepoLine.classList.add( 'repoEntry', 'stripe' + stripe );
		aRepoLine.href = '#' + name;
		stripe = ( stripe + 1 ) % 2;

		const divRepoName = document.createElement( 'div' );
		divRepoName.classList.add( 'name' );
		divRepoName.textContent = name;
		aRepoLine.appendChild( divRepoName );

		const divRepoDesc = document.createElement( 'div' );
		divRepoDesc.classList.add( 'desc' );
		divRepoDesc.textContent = repo.description;
		aRepoLine.appendChild( divRepoDesc );

		repoLines.push( aRepoLine );
	}

	divRepoTable.replaceChildren.apply( divRepoTable, repoLines );
};
