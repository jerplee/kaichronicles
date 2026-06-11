import * as https from "https";
import * as http from "http";
import * as fs from "fs";
import * as path from "path";

/**
 * Fetch directory listing HTML and extract file names (not subdirectories).
 */
function listDirectoryFiles(url: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const client = url.startsWith("https:") ? https : http;
        client.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                const redirectUrl = response.headers.location;
                if (!redirectUrl) {
                    reject(new Error(`Redirect without location from ${url}`));
                    return;
                }
                listDirectoryFiles(redirectUrl).then(resolve).catch(reject);
                return;
            }
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to list ${url}: status ${response.statusCode}`));
                return;
            }

            let data = "";
            response.on("data", (chunk) => { data += chunk; });
            response.on("end", () => {
                const files: string[] = [];
                // Match <a href="filename">filename</a> where filename doesn't end with /
                const regex = /<a\s+href="([^"]+)"[^>]*>[^<]+<\/a>/gi;
                let match;
                while ((match = regex.exec(data)) !== null) {
                    const href = match[1];
                    if (href && !href.endsWith("/") && href !== "..") {
                        // Some listings URL-encode spaces; decode them
                        files.push(decodeURIComponent(href));
                    }
                }
                resolve(files);
            });
        }).on("error", reject);
    });
}

/**
 * Download all files from an HTTP directory listing into a local directory.
 * Creates the local directory if needed.
 * If the URL returns 404, treats it as an empty directory (no error).
 */
export async function downloadDirectory(url: string, destDir: string): Promise<void> {
    fs.mkdirSync(destDir, { recursive: true });
    let files: string[];
    try {
        files = await listDirectoryFiles(url);
    } catch (e) {
        if (e instanceof Error && e.message.includes("status 404")) {
            console.warn("  Directory not found, skipping: " + url);
            return;
        }
        throw e;
    }
    const downloads = files.map((file) => {
        const fileUrl = url.endsWith("/") ? url + file : url + "/" + file;
        const destPath = path.join(destDir, file);
        return downloadFile(fileUrl, destPath);
    });
    await Promise.all(downloads);
}

/**
 * Download a single file from a URL to a local path.
 * Creates parent directories if needed.
 * If optional is true and the URL returns 404, logs a warning and resolves without error.
 */
export function downloadFile(url: string, destPath: string, optional = false): Promise<void> {
    return new Promise((resolve, reject) => {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });

        const file = fs.createWriteStream(destPath);
        const client = url.startsWith("https:") ? https : http;

        client.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                // Follow redirect
                const redirectUrl = response.headers.location;
                if (!redirectUrl) {
                    reject(new Error(`Redirect without location header from ${url}`));
                    return;
                }
                file.close();
                fs.unlinkSync(destPath);
                downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
                return;
            }

            if (response.statusCode === 404 && optional) {
                file.close();
                fs.unlinkSync(destPath);
                console.warn("  File not found, skipping: " + url);
                resolve();
                return;
            }

            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download ${url}: status ${response.statusCode}`));
                return;
            }

            response.pipe(file);
            file.on("finish", () => {
                file.close();
                resolve();
            });
        }).on("error", (err) => {
            fs.unlinkSync(destPath);
            reject(err);
        });
    });
}
