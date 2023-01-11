/*
| The yagit web client root.
*/
'use strict';

def.attributes =
{
	// the current place
	place: { type: 'Yagit/Client/Place' },

	// currently shown page
	currentPage: { type: [ 'undefined', 'string' ] },

	// the error page
	pageError: { type: [ 'undefined', 'Yagit/Page/Error' ] },

	// the listing page
	pageListing: { type: [ 'undefined', 'Yagit/Page/Listing' ] },

	// the login page
	pageLogin: { type: [ 'undefined', 'Yagit/Page/Login' ] },

	// the main page
	pageMain: { type: [ 'undefined', 'Yagit/Page/Main' ] },

	// currently logged in username
	username: { type: [ 'undefined', 'string' ] },
};

def.global = 'root';

const Ajax = tim.require( 'Yagit/Client/Ajax' );
const PageError = tim.require( 'Yagit/Page/Error' );
const PageListing = tim.require( 'Yagit/Page/Listing' );
const PageLogin = tim.require( 'Yagit/Page/Login' );
const PageMain = tim.require( 'Yagit/Page/Main' );
const Path = tim.require( 'Yagit/Path/Self' );
const Place = tim.require( 'Yagit/Client/Place' );
const ReplyError = tim.require( 'Yagit/Reply/Error' );
const ReplyAuth = tim.require( 'Yagit/Reply/Auth' );
const RequestAuth = tim.require( 'Yagit/Request/Auth' );

/*
| Shows the error page.
*/
def.proto.error =
	function( message )
{
	const pageError = PageError.create( 'message', message );
	root.create( 'pageError', pageError, 'currentPage', 'pageError' );
	pageError.show( );
};

/*
| Goes to the place page and adds a history entry for it.
*/
def.proto.go =
	function( place )
{
/**/if( CHECK )
/**/{
/**/	if( arguments.length !== 1 ) throw new Error( );
/**/	if( place.timtype !== Place ) throw new Error( );
/**/}

	if( place.page !== 'logout' )
	{
		history.pushState( place, place.title, place.hash );
		root.create( 'place', place );
	}
	root._show( place.page );
};

/*
| Received an auth reply.
*/
def.proto.onAuth =
	function( request, reply )
{
	switch( reply.$type )
	{
		case 'ReplyError': reply = ReplyError.FromJson( reply ); break;
		case 'ReplyAuth': reply = ReplyAuth.FromJson( reply ); break;
		default: reply = ReplyError.Message( 'invalid reply' ); break;
	}

	if( reply.timtype === ReplyError )
	{
		// if session auth failed, put the user to login
		console.log( reply.message );
		root._show( 'pageLogin' );
		return;
	}

	root.teleport( this.place );
};

/*
| Goes to the place page and adding NO history entry for it.
*/
def.proto.teleport =
	function( place )
{
/**/if( CHECK )
/**/{
/**/	if( arguments.length !== 1 ) throw new Error( );
/**/	if( place.timtype !== Place ) throw new Error( );
/**/}

	history.replaceState( place, place.title, place.hash );
	root.create( 'place', place );
	//root._show( place.page );

	if( place.path.length === 0 )
	{
		root._show( 'pageListing' );
	}
	else
	{
		root._show( 'pageMain' );
	}
};

/*
| Shows the page.
|
| Internal function other modules use 'go' or 'stay'.
*/
def.proto._show =
	function( pagename )
{
	switch( pagename )
	{
		case 'pageListing':
		{
			const pageListing =
				( root.pageListing || PageListing )
				.create(
					'place', root.place,
					'username', root.username,
				);

			root.create( 'pageListing', pageListing, 'currentPage', 'pageListing' );
			pageListing.show( );
			return;
		}

		case 'pageLogin':
		{
			const pageLogin =
				( root.pageLogin || PageLogin )
				.create( 'place', root.place );

			root.create( 'pageLogin', pageLogin, 'currentPage', 'pageLogin' );
			pageLogin.show( );
			return;
		}

		case 'pageMain':
		{
			const pageMain =
				( root.pageMain || PageMain )
				.create(
					'place', root.place,
					'username', root.username,
				);

			root.create( 'pageMain', pageMain, 'currentPage', 'pageMain' );
			pageMain.show( );
			return;
		}

		default: throw new Error( );
	}
};

/*
| Client starts up.
*/
const _onload =
	function( )
{
	let place = Place.FromURL( window.location.href );
	if( !place ) place = Place.PathOptions( Path.Empty );

	Self.create(
		'place', place,
		'username', 'axel', // XXX
	);

	window.onhashchange =
		function( event )
	{
		const place = Place.FromURL( event.newURL );
		root.teleport( place );
	};

	// first tries to make a session auth (from stored cookie)
	Ajax.request( RequestAuth.singleton, undefined, 'onAuth' );
};

if( !NODE ) window.onload = _onload;
