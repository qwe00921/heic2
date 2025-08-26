// Type definitions for jsPDF
declare namespace jsPDF {
	interface jsPDFOptions {
		orientation?: 'portrait' | 'landscape';
		unit?: 'pt' | 'mm' | 'cm' | 'in';
		format?: string | number[];
		putOnlyUsedFonts?: boolean;
		compress?: boolean;
		precision?: number;
		userUnit?: number;
		floatPrecision?: number;
		hotfixes?: string[];
	}

	interface ImageOptions {
		format?: string;
		quality?: number;
	}
}

declare class jsPDF {
	constructor(options?: jsPDF.jsPDFOptions);
	constructor(
		orientation?: 'portrait' | 'landscape',
		unit?: 'pt' | 'mm' | 'cm' | 'in',
		format?: string | number[]
	);

	// Page methods
	addPage(format?: string | number[], orientation?: 'portrait' | 'landscape'): jsPDF;
	setPage(page: number): jsPDF;
	deletePage(targetPage: number): jsPDF;

	// Image methods
	addImage(
		imageData: string | HTMLImageElement | HTMLCanvasElement | Uint8Array,
		format: string,
		x: number,
		y: number,
		width?: number,
		height?: number,
		alias?: string,
		compression?: string,
		rotation?: number
	): jsPDF;

	// Output methods
	output(type?: string, options?: any): string | ArrayBuffer | Blob | Window | jsPDF;
	save(filename?: string): jsPDF;

	// Property getters
	internal: {
		pageSize: {
			getWidth(): number;
			getHeight(): number;
		};
	};
}

declare const jspdf: {
	jsPDF: typeof jsPDF;
};

declare global {
	const jsPDF: typeof jsPDF;
}

export = jsPDF;
export as namespace jsPDF;