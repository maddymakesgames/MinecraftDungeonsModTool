const config: Config = JSON.parse(Deno.readTextFileSync('./config.json'));
const assetFile: AssetFile = JSON.parse(Deno.readTextFileSync('./assets.json'));
const UNREALDIR = config.UnrealDir + '/Engine/Binaries/' + getOSName();
const WINUNREALDIR = config.UnrealDir + '/Engine/Binaries/' + 'Win64';
const DEBUG = config.debug;
const EXTENSION = getOSExtension();

if(!UNREALDIR) console.error('You must specify your unreal engine directory in config.json');
else if(!assetFile.assets) console.error('You must specify assets to create your mod.');
// TODO: implement better error messages
else if(!validateAssets()) console.error('assets.json is invalid, please correct.');
else main();

async function main() {
	console.log("Minecraft dungeons mod creator v0.0.1");

	console.log('Grabing UnrealPak files...');
	grabUnrealPak();

	console.log('Importing assets into unreal...');
	await importAssets();
	
	console.log('Cooking assets...');
	await cookAssets();
	
	console.log('Copying cooked assets into tmp directory');
	await formatToPak();
	
	createAssetList();
	
	console.log('Compressing files into .pak...');
	let pakFile = createFileSafe('./output.pak');
	await compressPak(pakFile);
	
	console.log('Cleaning up...');
	if(!DEBUG) cleanUp();
	console.log(`Done! Your mod is at ${pakFile}`);
}

async function importAssets() {
	let assetsToImport = assetFile.assets;
	for(let asset of assetsToImport) {
		let splitName = asset.name.split('/');
		let name = splitName[splitName.length - 1].split('.')[0];
		ensurePathExists(`./UEProjecttemplate/MCDungeonModtemplate/Content${asset.destination.replace(name, '')}`);
		await importAsset(Deno.realPathSync(`./source/${asset.name}`), `${asset.destination.replace(name, '')}`);
	}
}

async function formatToPak() {
	let assetsToMove = assetFile.assets;
	for(let asset of assetsToMove) {
		let splitName = asset.name.split('/');
		let name = splitName[splitName.length-1].split('.')[0];
		ensurePathExists(`./tmp/unpak${asset.destination.replace(name, '')}`);
		ensurePathExists(`./tmp/unpak${asset.destination.replace(name, '')}`);
		copyFile(`./UEProjecttemplate/MCDungeonModtemplate/Saved/Cooked/WindowsNoEditor/MCDungeonModtemplate/Content${asset.destination}.uasset`, `./tmp/unpak${asset.destination}.uasset`);
		copyFile(`./UEProjecttemplate/MCDungeonModtemplate/Saved/Cooked/WindowsNoEditor/MCDungeonModtemplate/Content${asset.destination}.uexp`, `./tmp/unpak${asset.destination}.uexp`);
	}
}

function createAssetList() {
	let list: string[] = [];

	for(let asset of assetFile.assets) {
		list.push(`../../..${asset.destination}.uasset`);
		list.push(`../../..${asset.destination}.uexp`);
	}
	Deno.writeTextFileSync('./tmp/pakList.txt', `"../../../Mount point ../../../\n"${list.join('"\n"')}"`);
}

function grabUnrealPak() {
	let unrealPakFiles = readDirRecursive(UNREALDIR).filter((file) => /UnrealPak/g.test(file) && (file.endsWith('.exe') || file.endsWith('.modules') || file.endsWith('.dll')));
	ensurePathExists('./tmp/unpak/uepak/4.22/bin');
	unrealPakFiles.forEach((file) => {
		let splitName = file.split('/');
		let name = splitName[splitName.length - 1];
		copyFile(file, `./tmp/unpak/uepak/4.22/bin/${name}`);
	})
}

/* 
	These two functions require UE4Editor-Cmd which Unreal only installs the version for your os
	and so I cannot test as I only have unreal for windows
	I'm assuming that if I changed it to the normal os detection it would just work
	Dungeons is currently only for windows anyway so I'm not going to worry about it for now
	Support is probably easy but I need to get unreal for linux first so I can actually test it
	TODO: add support for other os-es for importing and cooking assets
*/
async function importAsset(png: string, output: string) {
	await runUnrealCmdWindows('UE4Editor-Cmd', `${unixToWindows(Deno.realPathSync('./UEProjecttemplate/MCDungeonModtemplate/MCDungeonModtemplate.uproject'))}`, '-run=ImportAssets', `-source=${unixToWindows(png)}`, `-dest="${output}"`, '-AllowCommandletRendering');
}


async function cookAssets() {
	// TODO: Support other targets if Minecraft Dungeons gets ported and needs assets to be baked differently
	await runUnrealCmdWindows('UE4Editor-Cmd', `${unixToWindows(Deno.realPathSync('./UEProjecttemplate/MCDungeonModtemplate/MCDungeonModtemplate.uproject'))}`, '-run=cook', '-targetplatform=WindowsNoEditor', '-CookAll')
}


// TODO: Add option to decompress .pak-s
async function decompressPak(pak:string, output: string) {
	await runUEPakCmd('UnrealPak', pak, '-extract', Deno.realPathSync(output));
}

async function compressPak(output:string, ...files:string[]) {
	let outputSplit = output.split('/');
	let outputFile = outputSplit.pop();
	let outputPath = outputSplit.join('/');
	await runUEPakCmd('UnrealPak', Deno.realPathSync(outputPath) + `/${outputFile}`, `-Create="${Deno.realPathSync('./tmp/')}/pakList.txt"`, '-compress')
}

async function runUnrealCmd(cmd:string, ...args:string[]){
	if(DEBUG) console.log([`${UNREALDIR}/${cmd}${EXTENSION}`, ...args]);
	let cmdOutput = await Deno.run({
		cmd: [`${UNREALDIR}/${cmd}${EXTENSION}`, ...args],
		stdout: 'piped'
	}).output();
	if(DEBUG) Deno.stdout.write(cmdOutput)
}

async function runUEPakCmd(cmd: string, ...args: string[]) {
	if(DEBUG) console.log([`./tmp/unpak/uepak/bin/${cmd}${EXTENSION}`, ...args]);

	let cmdOutput = await Deno.run({
		cmd: [`./tmp/unpak/uepak/4.22/bin/${cmd}${EXTENSION}`, ...args],
		stdout: 'piped'
	}).output();
	if(DEBUG) Deno.stdout.write(cmdOutput);
}

// Forces use of windows EXEs
// TODO: Make it so this isn't needed
async function runUnrealCmdWindows(cmd: string, ...args: string[]) {
	if (DEBUG) console.log([`${WINUNREALDIR}/${cmd}.exe`, ...args]);
	let cmdOutput = await Deno.run({
		cmd: [`${WINUNREALDIR}/${cmd}.exe`, ...args],
		stdout: 'piped'
	}).output();
	if (DEBUG) Deno.stdout.write(cmdOutput)
}

function cleanUp() {
	Deno.removeSync('./tmp/unpak/', { recursive: true});
	Deno.mkdirSync('./tmp/unpak/');
	if(exists('./tmp/pakList.txt')) Deno.removeSync('./tmp/pakList.txt');
	Deno.removeSync('./UEProjecttemplate/MCDungeonModtemplate/Saved/Cooked/WindowsNoEditor/MCDungeonModtemplate/Content/', { recursive: true});
	Deno.mkdirSync('./UEProjecttemplate/MCDungeonModtemplate/Saved/Cooked/WindowsNoEditor/MCDungeonModtemplate/Content/');
	Deno.removeSync('./UEProjecttemplate/MCDungeonModtemplate/Content/', { recursive: true });
	Deno.mkdirSync('./UEProjecttemplate/MCDungeonModtemplate/Content');
}

function readDirRecursive(path: string):string[] {
	let output: string[] = [];
	for (const f of Deno.readDirSync(path)) {
		if(f.isDirectory) output.push(...readDirRecursive(`${path}/${f.name}`));
		if(f.isFile) output.push(Deno.realPathSync(`${path}/${f.name}`));
	}
	return output;
}

function unixToWindows(path: string):string {
	if(!path.startsWith('/mnt/')) return path;
	path = path.slice(5);
	let returnStr = '';
	returnStr += path.substring(0, 1).toUpperCase();
	returnStr += ':';
	returnStr += path.substring(1);
	return returnStr;
}


function getOSName(): string {
	let os: string = Deno.build.os;
	let arch: string = Deno.build.arch;

	switch (os) {
		case 'darwin':
			return "Mac";
		case 'linux':
			return 'Linux';
		case 'windows':
			return arch == 'x86_64' ? 'Win64' : 'Win32'
		default:
			return "oop"
	}
}

function getOSExtension(): string {
	let os: string = Deno.build.os;

	switch (os) {
		case 'windows':
			return '.exe';
		default:
			return '';
	}
}

function ensurePathExists(path:string) {
	if(exists(path)) return;
	Deno.mkdirSync(path, { recursive: true });
}

function exists(path: string): boolean {
	try {
		Deno.statSync(path);
		return true;
	} catch(e) {
		return false;
	}
}

function createFileSafe(path: string): string {
	if(exists(path)) {
		let extensionSplit = path.split('.');
		let newPath = '';
		for(let i = extensionSplit.length - 1; i > -1; i--) {
			if(extensionSplit[i].includes('/') || i == 0) {
				for(let e = 0; e < i; e++) {
					newPath += extensionSplit[0] + '.';
					extensionSplit.shift();
				}
				newPath += extensionSplit[0] + '-1';
				extensionSplit.shift();
				newPath += '.' + extensionSplit.join('.');
				break;
			}
		}
		return createFileSafe(newPath);
	}
	Deno.writeTextFileSync(path, 'garbage data lmao');
	return path;
}

function copyFile(origin: string, destination: string) {
	let ogFile = Deno.readFileSync(origin);
	Deno.writeFileSync(destination, ogFile);
}

function validateAssets(): boolean {
	for(let asset of assetFile.assets) {
		if(!asset.destination || !asset.name) return false;
		if(!asset.destination.startsWith('/')) return false;
	}
	return true;
}

type Config = {
	UnrealDir: string,
	debug: boolean
}

type AssetFile = {
	assets: [AssetData]
}

type AssetData = {
	name: string,
	destination: string
}