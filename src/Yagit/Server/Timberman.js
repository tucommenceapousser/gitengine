/*
| Handles yagit specific adaptions to timberman.
*/
'use strict';

def.attributes =
{
	// the general timberman instance
	_tm : { type : 'timberman:Timberman' }
};

//const doBundle = true;
const doBundle = false;
const fs = require( 'fs/promises' );
const terser = require( 'terser' );

const Ajax = tim.require( 'Yagit/Server/Ajax' );
const Branches = tim.require( 'Yagit/Server/Branches' );
const Diffs = tim.require( 'Yagit/Server/Diffs' );
const Dir = tim.require( 'Yagit/Server/Dir' );
const File = tim.require( 'Yagit/Server/File' );
const History = tim.require( 'Yagit/Server/History' );
const Log = tim.require( 'Log/Self' );
const Path = tim.require( 'Yagit/Path/Self' );
const Sha1 = tim.require( 'timberman:Sha1' );
const Timberman = tim.require( 'timberman:Timberman' );

tim.require( 'Yagit/Client/Root.js' );

/*
| Intercepts file requests to handle without timberman.
*/
function interceptRequest( request, result, pathname )
{
	pathname = decodeURI( pathname );
	const path = Path.String( pathname );
	const parts = path.parts;

	if( parts.length === 0 ) return false;
	const p0 = parts.get( 0 );

	switch( p0 )
	{
		case 'branches':
			Branches.handle( request, result, path );
			return true;
		case 'diffs':
			Diffs.handle( request, result, path );
			return true;
		case 'dir':
			Dir.handle( request, result, path );
			return true;
		case 'file':
			File.handle( request, result, path );
			return true;
		case 'history':
			History.handle( request, result, path );
			return true;
		default:
			return false;
	}
}

/*
| Handles an ajax call.
|
| ~type: 'close' or 'json'
| ~json: if json the parsed json
|
| ~result: the http(s) result object
*/
def.proto.ajax =
	async function( type, json, result )
{
	if( type === 'close' ) return;
	if( type !== 'json' ) throw new Error( );
	return await Ajax.handle( json, result );
};

/*
| Prepares timberman.
|
| ~absolute dir of root directory.
*/
def.static.prepare =
	async function( adir )
{
	Log.log( 'yagit', '*', 'preparing timberman' );

	// FIXME do allow caching
	let tm =
		Timberman.create(
			'log', console.log,
			'interceptRequest', interceptRequest,
			'requestCaching', false
		);

	tm = await Self._addClientConfig( tm );
	tm = await tim.addTimbermanResources( tm, 'client' );
	tm = await Self._addRoster( tm, adir );
	tm = await tm.addCopse( 'gitengine:Yagit/Client/Root.js', 'client' );
	tm = tim.addTimbermanCatalog( tm );

	if( doBundle )
	{
		const bundle = await Self._buildBundle( tm );
		const hash = Sha1.calc( bundle.code );
		const sourceMapName = 'source-' + hash + '.map';
		const bundleName = 'client-' + hash + '.js';
		tm = await tm.addResource(
			adir,
			{
				name: bundleName,
				age: 'long',
				data: bundle.code,
				map: sourceMapName,
			}
		);
		tm = await tm.addResource(
			adir,
			{
				name: sourceMapName,
				age: 'long',
				data: bundle.map
			}
		);
		Log.log( 'yagit', '*', 'bundle:', bundleName );
		tm = await Self._transduce( tm, bundleName );
		const bRes = tm.get( bundleName );
		const gzip = await bRes.gzip( );
		Log.log( 'yagit', '*', 'uncompressed bundle size is', bRes.data.length );
		Log.log( 'yagit', '*', '  compressed bundle size is', gzip.length );
	}
	else
	{
		tm = await Self._transduce( tm, undefined );
	}

	return Self.create( '_tm', tm );
};

/*
| Serves a yagit request.
|
| ~count: client counter
| ~req: request
| ~res: result
| ~urlSplit: url splitted into parts
*/
def.proto.serve =
	async function( count, req, res, urlSplit )
{
	this._tm.requestListener( req, res );
};

/*
| The client config as resource.
*/
def.static._addClientConfig =
	async function( timberman )
{
	return( await timberman.addResource(
		undefined,
		{
			name : 'config.js',
			list : 'client',
			data :
				'var CHECK = true;\n'
				+ 'var NODE = false;\n'
		}
	) );
};

/*
| Adds the basic roster to a timberman.
*/
def.static._addRoster =
	async function( timberman, base )
{
	return await timberman.addResource(
		base,
		{
			name : [ 'index.html', '' ],
			file : './media/yagit/index.html',
		},
		{
			// needs to separate resource since transduced differently
			name : 'devel.html',
			file : './media/yagit/index.html',
		},
		{
			name : 'style.css',
			file : './media/yagit/style.css',
		},
		{
			name : 'prism.css',
			file : './dist/yagit/prism.css',
		},
		{
			name : 'prism-dev.css',
			file : './dist/yagit/prism-dev.css',
		},
		{
			name : 'prism.js',
			file : './dist/yagit/prism.js',
		},
		{
			name : 'prism-dev.js',
			file : './dist/yagit/prism-dev.js',
		},
		{
			name : 'ajax',
			ajax :
				async function( )
			{
				const tm = root.timberman;
				return await tm.ajax.apply( tm, arguments );
			}
		}
	);
};

/*
| Builds the client bundle for quick loading.
*/
def.static._buildBundle =
	async function( timberman )
{
	Log.log( 'yagit', '*', 'building bundle' );
	const code = { };
	for( let name of timberman.getList( 'client' ) )
	{
		if( name === 'global-client.js' ) continue;
		const res = timberman.get( name );
		code[ name ] = res.data + '';
	}

	const globals =
	{
		CHECK: true,
		NODE: false,
	};

	const options =
	{
		compress: { ecma: 6, global_defs: globals, },
		output: { beautify: false, },
		sourceMap: { filename: 'source.map' },
	};

	const result = await terser.minify( code, options );
	await fs.writeFile( 'report/source.map', result.map );

	if( result.error ) throw new Error( 'minify error: ' + result.error );
	return result;
};

/*
| PostProcessor.
*/
def.static._transduce =
	function( timberman, bundleName )
{
	{
		const res = timberman.get( 'devel.html' );
		let data = res.data + '';
		const scripts = [ ];
		for( let name of timberman.getList( 'client' ) )
		{
			scripts.push( '<script src="' + name + '" type="text/javascript" defer></script>' );
		}
		data = data.replace( /<!--SCRIPTS.*>/, scripts.join( '\n' ) );
		timberman = timberman.updateResource( res.create( 'data', data ) );
	}

	if( bundleName )
	{
		const res = timberman.get( 'index.html' );
		let data = res.data + '';
		data =
			data.replace(
				/<!--SCRIPTS.*>/,
				'<script src="' + bundleName + '" type="text/javascript"></script>'
			);
		timberman = timberman.updateResource( res.create( 'data', data ) );
	}

	return timberman;
};
