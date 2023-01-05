/*
| yawgit - yet another git interface.
|
|          root.
*/
'use strict';

def.abstract = true;

const Log = tim.require( 'Log/Self' );
const SessionManager = tim.require( 'Yagit/Session/Manager' );
const Timberman = tim.require( 'Yagit/Server/Timberman' );

/*
| The timberman middleware.
*/
let _timberman;

/*
| Initializes yagit root.
*/
def.static.init =
	async function( dir )
{
	Log.log( 'yagit', '*', 'init' );
	_timberman = await Timberman.prepare( dir );
	SessionManager.init( );
	Log.log( 'yagit', '*', 'prepared' );
};

/*
| Serves a yagit request.
|
| ~count: client counter
| ~req: request
| ~res: result
| ~urlSplit: url splitted into parts
*/
def.static.serve =
	async function( count, req, res, urlSplit )
{
	_timberman.serve( count, req, res, urlSplit );
};
