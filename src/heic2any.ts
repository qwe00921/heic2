import "./gifshot";
import "./libheif";
import "./jspdf";

const supportedMIMETypes = ["image/png", "image/jpeg", "image/gif", "application/pdf"];

type ResultType = "Blob" | "ImageData";

const utils = {
	blobToDataURL: function (blob: Blob): Promise<string> {
		return new Promise((resolve, reject) => {
			let reader = new FileReader();
			reader.onerror = function () {
				reject("ERR_DOM Error on converting blob to data URL");
			};
			reader.onload = (e) => {
				resolve((reader as any).result);
			};
			reader.readAsDataURL(blob);
		});
	},

	dataURItoBlob: function (dataURI: string): Blob | string {
		try {
			var byteString = atob(dataURI.split(",")[1]);
			var mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
			var ab = new ArrayBuffer(byteString.length);
			var ia = new Uint8Array(ab);
			for (var i = 0; i < byteString.length; i++) {
				ia[i] = byteString.charCodeAt(i);
			}
			var blob = new Blob([ab], { type: mimeString });
			return blob;
		} catch (e) {
			return "ERR_DOM Error on converting data URI to blob " + ((e as any) && (e as any).toString ? (e as any).toString() : String(e));
		}
	},

	imageDataToBlob: function ({
		imageData,
		toType = "image/png",
		quality = 0.92,
	}: {
		imageData: ImageData;
		toType?: string;
		quality?: number;
	}): Promise<Blob> {
		// normalize quality
		if (quality > 1 || quality < 0) {
			quality = 0.92;
		}
		// normalize MIME type
		if (supportedMIMETypes.indexOf(toType) === -1) {
			toType = "image/png";
		}
		return new Promise((resolve, reject) => {
			let canvas: HTMLCanvasElement | null = null;

			try {
				canvas = document.createElement("canvas");
			} catch (e) {}

			if (!canvas) {
				return reject(
					"ERR_CANVAS Error on converting imagedata to blob: Could not create canvas element"
				);
			}

			canvas.width = imageData.width;
			canvas.height = imageData.height;
			const ctx = canvas.getContext("2d");
			if (!ctx) {
				return reject(
					"ERR_CANVAS Error on converting imagedata to blob: Could not get canvas context"
				);
			}
			ctx.putImageData(imageData, 0, 0);
			canvas.toBlob(
				(blob) => {
					if (!blob) {
						return reject(
							"ERR_CANVAS Error on converting imagedata to blob: Could not get blob from canvas"
						);
					}
					return resolve(blob);
				},
				toType,
				quality
			);
		});
	},

	imagesToGif: function ({
		images,
		interval,
		gifHeight,
		gifWidth,
	}: {
		images: string[];
		interval: number;
		gifHeight: number;
		gifWidth: number;
	}): Promise<string> {
		return new Promise((resolve, reject) => {
			gifshot.createGIF(
				{
					images,
					interval,
					gifHeight,
					gifWidth,
				},
				(res) => {
					if (res.error) {
						reject(`ERR_GIF ${res.errorCode} ${res.errorMessage}`);
					}
					return resolve(res.image);
				}
			);
		});
	},

	imagesToPdf: function ({
		images,
		pageFormat = "a4",
		orientation = "portrait",
		quality = 0.92,
	}: {
		images: string[];
		pageFormat?: string;
		orientation?: "portrait" | "landscape";
		quality?: number;
	}): Promise<string> {
		return new Promise((resolve, reject) => {
			try {
				const pdf = new (window as any).jsPDF({
					orientation,
					unit: "mm",
					format: pageFormat,
				});

				const pageWidth = pdf.internal.pageSize.getWidth();
				const pageHeight = pdf.internal.pageSize.getHeight();
				let loadedImages = 0;

				images.forEach((imageDataUrl, index) => {
					if (index > 0) {
						pdf.addPage();
					}

					// Create a temporary image to get dimensions
					const img = new Image();
					img.onload = () => {
						const imgWidth = img.width;
						const imgHeight = img.height;

						// Calculate aspect ratio and fit to page
						let finalWidth, finalHeight;
						if (pageFormat === "original") {
							// Use original image dimensions (converted from pixels to mm)
							finalWidth = imgWidth * 0.264583; // Convert pixels to mm (96 DPI)
							finalHeight = imgHeight * 0.264583;
							// Adjust PDF page size to match image
							if (index === 0) {
								// For first page, recreate PDF with custom size
								const customPdf = new (window as any).jsPDF({
									orientation: finalWidth > finalHeight ? "landscape" : "portrait",
									unit: "mm",
									format: [finalWidth, finalHeight],
								});
								customPdf.addImage(
									imageDataUrl,
									"JPEG",
									0,
									0,
									finalWidth,
									finalHeight
								);
								resolve(customPdf.output("datauristring"));
								return;
							}
						} else {
							// Fit to page while maintaining aspect ratio
							const imgRatio = imgWidth / imgHeight;
							const pageRatio = pageWidth / pageHeight;

							if (imgRatio > pageRatio) {
								// Image is wider, fit by width
								finalWidth = pageWidth;
								finalHeight = pageWidth / imgRatio;
							} else {
								// Image is taller, fit by height
								finalHeight = pageHeight;
								finalWidth = pageHeight * imgRatio;
							}
						}

						// Center the image on the page
						const x = (pageWidth - finalWidth) / 2;
						const y = (pageHeight - finalHeight) / 2;

						pdf.addImage(
							imageDataUrl,
							"JPEG",
							x,
							y,
							finalWidth,
							finalHeight
						);

						loadedImages++;
						// If this is the last image, resolve with the PDF data URL
						if (loadedImages === images.length) {
							const pdfDataUrl = pdf.output("datauristring");
							resolve(pdfDataUrl);
						}
					};
					img.onerror = () => {
						reject(`ERR_PDF Error loading image ${index}`);
					};
					img.src = imageDataUrl;
				});
			} catch (e) {
				reject(`ERR_PDF Error creating PDF: ${e}`);
			}
		});
	},

	otherImageType: function (buffer: ArrayBuffer) {
		/**
		 * Some confusion might arise when passing a regular image
		 * like jpeg/png/gif and getting "format is not supported"
		 * so to solve this, we should detect if the image is
		 * already browser-readable.
		 */
		const arr = new Uint8Array(buffer).subarray(0, 4);
		let header = "";
		for (let i = 0; i < arr.length; i++) {
			header = header + arr[i].toString(16);
		}
		switch (header) {
			case "89504e47":
				return "image/png";
			case "47494638":
				return "image/gif";
			case "ffd8ffe0":
			case "ffd8ffe1":
			case "ffd8ffe2":
			case "ffd8ffe3":
			case "ffd8ffe8":
				return "image/jpeg";
			default:
				return false;
		}
	},

	error: function (message: string) {
		/**
		 * Error coding system:
		 *
		 * UNKNOWN = 0
		 * USER errors = 1
		 * LIBHEIF errors = 2
		 * GIF errors = 3
		 * DOM errors = 4
		 * CANVAS errors = 5
		 * PDF errors = 6
		 *
		 */

		let code = 0;

		if (!message) {
			message = "ERR_UNKNOWN";
		} else if (typeof message !== "string") {
			if ((message as any).toString) {
				message = (message as any).toString();
			} else {
				message = JSON.stringify(message);
			}
		}

		const headers = [
			"ERR_USER",
			"ERR_LIBHEIF",
			"ERR_GIF",
			"ERR_DOM",
			"ERR_CANVAS",
			"ERR_PDF",
		];
		for (let index = 0; index < headers.length; index++) {
			const header = headers[index];
			if (message.indexOf(header) === 0) {
				code = index + 1;
			}
		}
		return {
			code,
			message,
		};
	},
};

function decodeBuffer(buffer: ArrayBuffer): Promise<ImageData[]> {
	return new Promise((resolve, reject) => {
		const id = (Math.random() * new Date().getTime()).toString();
		const message = { id, buffer };
		((window as any).__heic2any__worker as Worker).postMessage(message);
		((window as any).__heic2any__worker as Worker).addEventListener(
			"message",
			(message) => {
				if (message.data.id === id) {
					if (message.data.error) {
						return reject(message.data.error);
					}
					return resolve(message.data.imageDataArr);
				}
			}
		);
	});
}

function heic2any({
	blob,
	toType = "image/png",
	quality = 0.92,
	gifInterval = 0.4,
	multiple = undefined,
	pdfPageFormat = "a4",
	pdfOrientation = "portrait",
}: {
	blob: Blob;
	multiple?: true;
	toType?: string;
	quality?: number;
	gifInterval?: number;
	pdfPageFormat?: string;
	pdfOrientation?: "portrait" | "landscape";
}): Promise<Blob | Blob[]> {
	return new Promise(
		(
			resolve,
			reject: (reason: { code: number; message: string }) => void
		) => {
			if (!(blob instanceof Blob)) {
				utils.error(`ERR_USER library only accepts BLOBs as input`);
			}
			if (typeof multiple !== "boolean") {
				utils.error(
					`ERR_USER "multiple" parameter should be of type "boolean"`
				);
			}
			if (typeof quality !== "number") {
				utils.error(
					`ERR_USER "quality" parameter should be of type "number"`
				);
			}
			if (typeof gifInterval !== "number") {
				utils.error(
					`ERR_USER "gifInterval" parameter should be of type "number"`
				);
			}
			if (typeof pdfPageFormat !== "string") {
				utils.error(
					`ERR_USER "pdfPageFormat" parameter should be of type "string"`
				);
			}
			if (typeof pdfOrientation !== "string") {
				utils.error(
					`ERR_USER "pdfOrientation" parameter should be of type "string"`
				);
			}
			const reader = new FileReader();
			reader.onload = (e) => {
				let gifWidth = 0;
				let gifHeight = 0;
				const buffer = (e as any).target.result;
				const otherImageType = utils.otherImageType(buffer);
				if (otherImageType) {
					return reject(
						utils.error(
							`ERR_USER Image is already browser readable: ${otherImageType}`
						)
					);
				}
				decodeBuffer(buffer)
					.then((imageDataArr) => {
						gifWidth = imageDataArr[0].width;
						gifHeight = imageDataArr[0].height;
						return Promise.all(
							imageDataArr.map((imageData) =>
								utils.imageDataToBlob({
									imageData,
									toType,
									quality,
								})
							)
						);
					})
					.then((blobs) => {
						if (toType === "image/gif") {
							return Promise.all(
								blobs.map((blob) => utils.blobToDataURL(blob))
							).then((dataURIs) => {
								return utils.imagesToGif({
									images: dataURIs,
									interval: gifInterval,
									gifWidth,
									gifHeight,
								}).then((resultingGif) => {
									const blob = utils.dataURItoBlob(resultingGif);
									if (typeof blob === "string") {
										reject(utils.error(blob));
									} else {
										resolve(blob);
									}
								});
							});
						} else if (toType === "application/pdf") {
							return Promise.all(
								blobs.map((blob) => utils.blobToDataURL(blob))
							).then((dataURIs) => {
								if (multiple) {
									// Multiple PDFs: create one PDF per image
									return Promise.all(
										dataURIs.map((dataURI) =>
											utils.imagesToPdf({
												images: [dataURI],
												pageFormat: pdfPageFormat,
												orientation: pdfOrientation,
												quality,
											})
										)
									).then((pdfDataURIs) => {
										const pdfBlobs = pdfDataURIs.map((pdfDataURI) => {
											const blob = utils.dataURItoBlob(pdfDataURI);
											if (typeof blob === "string") {
												throw new Error(blob);
											}
											return blob;
										});
										resolve(pdfBlobs);
									});
								} else {
									// Single PDF: use only first image
									return utils.imagesToPdf({
										images: [dataURIs[0]],
										pageFormat: pdfPageFormat,
										orientation: pdfOrientation,
										quality,
									}).then((pdfDataURI) => {
										const blob = utils.dataURItoBlob(pdfDataURI);
										if (typeof blob === "string") {
											reject(utils.error(blob));
										} else {
											resolve(blob);
										}
									});
								}
							});
						} else if (multiple) {
							resolve(blobs);
						} else {
							resolve(blobs[0]);
						}
					})
					.catch((e: any) => {
						reject(utils.error(e));
					});
			};
			reader.readAsArrayBuffer(blob);
		}
	);
}

export default heic2any;
