/*
| yawgit - yet another git interface.
|
|          root.
*/
'use strict';

def.abstract = true;

const Log = ti2c.require( 'Log/Self' );
const SessionManager = ti2c.require( 'Yagit/Session/Manager' );
const Ti2cWeb = ti2c.require( 'Yagit/Server/Ti2cWeb' );

/*
| The ti2cWeb middleware.
*/
let _tw;

/*
| Initializes yagit root.
*/
def.static.init =
	async function( dir )
{
	Log.log( 'yagit', '*', 'init' );
	_tw = await Ti2cWeb.prepare( dir );
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
	_tw.serve( count, req, res, urlSplit );
};
