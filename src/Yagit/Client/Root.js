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

	// the login page
	pageLogin: { type: [ 'undefined', 'Yagit/Page/Login' ] },

	// the main page
	pageMain: { type: [ 'undefined', 'Yagit/Page/Main' ] },

	// current session
	session: { type: [ 'undefined', 'string' ] },

	// currently logged in username
	username: { type: [ 'undefined', 'string' ] },
};

def.global = 'root';

const PageError = tim.require( 'Yagit/Page/Error' );
const PageLogin = tim.require( 'Yagit/Page/Login' );
const PageMain = tim.require( 'Yagit/Page/Main' );
const Place = tim.require( 'Yagit/Client/Place' );

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
	root._show( 'pageMain' ); // XXX
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
	if( !place ) place = Place.PageOptions( 'SFB', 'view', 'tree', 'path', '/' );

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

	//root.teleport( place );
	// XXX
	root._show( 'pageLogin' );
};

if( !NODE ) window.onload = _onload;
