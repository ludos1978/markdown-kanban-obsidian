const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',

	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started');
		});
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				console.error(`    ${location.file}:${location.line}:${location.column}:`);
			});
			console.log('[watch] build finished');
		});
	},
};

const copyStaticFilesPlugin = {
	name: 'copy-static-files',
	setup(build) {
		build.onEnd(() => {
			if (!fs.existsSync('dist')) {
				fs.mkdirSync('dist', { recursive: true });
			}

			const srcHtmlDir = 'src/html';
			const distHtmlDir = 'dist/src/html';
			
			if (fs.existsSync(srcHtmlDir)) {
				fs.mkdirSync(distHtmlDir, { recursive: true });
				
				const files = fs.readdirSync(srcHtmlDir);
				files.forEach(file => {
					const srcFile = path.join(srcHtmlDir, file);
					const distFile = path.join(distHtmlDir, file);
					fs.copyFileSync(srcFile, distFile);
					console.log(`Copied ${srcFile} to ${distFile}`);
				});
			}
		});
	}
};

async function main() {
	const ctx = await esbuild.context({
		entryPoints: [
			'src/extension.ts'
		],
		bundle: true,
		format: 'cjs',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		outfile: 'dist/extension.js',
		external: ['vscode'],
		logLevel: 'silent',
		plugins: [
			copyStaticFilesPlugin,
			esbuildProblemMatcherPlugin,
		],
	});

	if (watch) {
		await ctx.watch();
	} else {
		await ctx.rebuild();
		await ctx.dispose();
	}
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});
