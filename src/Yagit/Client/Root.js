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

import { Self as Ajax } from '{Yagit/Client/Ajax}';
import { Self as PageError } from '{Yagit/Page/Error}';
import { Self as PageListing } from '{Yagit/Page/Listing}';
import { Self as PageLogin } from '{Yagit/Page/Login}';
import { Self as PageMain } from '{Yagit/Page/Main}';
import { Self as Path } from '{Yagit/Path/Self}';
import { Self as Place } from '{Yagit/Client/Place}';
import { Self as ReplyError } from '{Yagit/Reply/Error}';
import { Self as ReplyAuth } from '{Yagit/Reply/Auth}';
import { Self as RequestAuth } from '{Yagit/Request/Auth}';

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
/**/	if( place.ti2ctype !== Place ) throw new Error( );
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

	if( reply.ti2ctype === ReplyError )
	{
		// if session auth failed, put the user to login
		console.log( reply.message );
		root._show( 'pageLogin' );
		return;
	}

	root.create( 'username', reply.username );
	root.teleport( this.place );
};

/*
| Received a logout reply.
*/
def.proto.onLogout =
	function( request, reply )
{
	switch( reply.$type )
	{
		case 'ReplyError': reply = ReplyError.FromJson( reply ); break;
		case 'ReplyAuth': reply = ReplyAuth.FromJson( reply ); break;
		default: reply = ReplyError.Message( 'invalid reply' ); break;
	}

	if( reply.ti2ctype === ReplyError )
	{
		// if session auth failed, put the user to login
		console.log( reply.message );
		root._show( 'pageLogin' );
		return;
	}

	root._show( 'pageLogin' );
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
/**/	if( place.ti2ctype !== Place ) throw new Error( );
/**/}

	history.replaceState( place, place.title, place.hash );
	root.create( 'place', place );

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
	ti2c_onload( );

	let place = Place.FromURL( window.location.href );
	if( !place ) place = Place.PathOptions( Path.Empty );

	Self.create( 'place', place );

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
