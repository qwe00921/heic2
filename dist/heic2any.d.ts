import "./gifshot";
import "./libheif";
import "./jspdf";
declare function heic2any({ blob, toType, quality, gifInterval, multiple, pdfPageFormat, pdfOrientation, }: {
    blob: Blob;
    multiple?: true;
    toType?: string;
    quality?: number;
    gifInterval?: number;
    pdfPageFormat?: string;
    pdfOrientation?: "portrait" | "landscape";
}): Promise<Blob | Blob[]>;
export default heic2any;
