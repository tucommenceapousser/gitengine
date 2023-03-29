// global ti2c options
if( global.NODE === undefined ) global.NODE = true;
if( global.CHECK === undefined ) global.CHECK = true;

await import( '@csc1/passlock' );
let gitengine;

export const init =
	async ( ) =>
{
	const pkg = await ti2c.register( 'gitengine', import.meta, 'src/', 'init.js' );
	gitengine = await pkg.import( 'Self.js' );
	gitengine._init( pkg.dir );
};

export { gitengine as default };
export { gitengine as GitEngine };
