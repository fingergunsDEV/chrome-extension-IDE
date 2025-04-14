document.addEventListener("DOMContentLoaded", function () {
	// File Manager class
	class FileManager {
		constructor() {
			this.files = new Map();
			this.currentFile = null;
			this.supportedTypes = {
				".json": "javascript",
				".js": "javascript",
				".html": "htmlmixed",
				".css": "css"
			};
		}

		addFile(name, content = "") {
			if (!this.validateFileName(name)) {
				throw new Error("Invalid file name or type");
			}
			this.files.set(name, content);
			this.updateFileTree();
		}

		getFile(name) {
			return this.files.get(name) || "";
		}

		updateFile(name, content) {
			if (this.files.has(name)) {
				this.files.set(name, content);
				return true;
			}
			return false;
		}

		deleteFile(name) {
			this.files.delete(name);
			this.updateFileTree();
		}

		validateFileName(name) {
			return Object.keys(this.supportedTypes).some((ext) => name.endsWith(ext));
		}

		updateFileTree() {
			const fileTree = document.getElementById("fileTree");
			fileTree.innerHTML = Array.from(this.files.keys())
				.map(
					(name) => `
                    <li class="${
																					name === this.currentFile ? "active" : ""
																				}" data-file="${sanitizeInput(name)}">
                        <i class="fas fa-file-code"></i> ${sanitizeInput(name)}
                    </li>
                `
				)
				.join("");

			this.attachFileTreeListeners();
		}

		attachFileTreeListeners() {
			document.querySelectorAll("#fileTree li").forEach((item) => {
				item.addEventListener("click", () => this.handleFileSelection(item));
			});
		}

		handleFileSelection(item) {
			document
				.querySelectorAll("#fileTree li")
				.forEach((i) => i.classList.remove("active"));
			item.classList.add("active");
			this.currentFile = item.dataset.file;
			document.getElementById("fileLabel").textContent = this.currentFile;
			editor.setValue(this.getFile(this.currentFile));
			this.updateEditorMode();
			updatePreview();
		}
	}

	// Initialize components
	const fileManager = new FileManager();
	let editor;

	// Initialize CodeMirror
	function initializeEditor() {
		try {
			const textarea = document.getElementById("editor");
			editor = CodeMirror.fromTextArea(textarea, {
				lineNumbers: true,
				mode: "javascript",
				theme: "default",
				autoCloseBrackets: true,
				matchBrackets: true,
				indentUnit: 2,
				tabSize: 2,
				lineWrapping: true
			});

			editor.on("change", () => {
				if (fileManager.currentFile) {
					fileManager.updateFile(fileManager.currentFile, editor.getValue());
					saveProject();
				}
			});
		} catch (e) {
			console.error("Editor initialization failed:", e);
		}
	}

	// Initialize project
	function initializeProject() {
		try {
			// Add manifest.json
			fileManager.addFile(
				"manifest.json",
				JSON.stringify(
					{
						manifest_version: 3,
						name: "My Extension",
						version: "1.0",
						description: "A simple Chrome extension",
						action: {
							default_popup: "popup.html",
							default_icon: {
								16: "icon16.png",
								48: "icon48.png",
								128: "icon128.png"
							}
						},
						permissions: ["storage"],
						background: {
							service_worker: "background.js"
						}
					},
					null,
					2
				)
			);

			// Add popup.html (verified for correct syntax)
			fileManager.addFile(
				"popup.html",
				`<!DOCTYPE html>
<html>
<head>
    <title>My Extension</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <h1>Hello Extension!</h1>
    <script src="popup.js"></script>
</body>
</html>`
			);

			// Add other files
			fileManager.addFile(
				"popup.js",
				'// Popup script\nconsole.log("Extension loaded!");'
			);
			fileManager.addFile(
				"background.js",
				'// Background script\nconsole.log("Background script running");'
			);
			fileManager.addFile(
				"styles.css",
				"/* Extension styles */\nbody {\n    font-family: Arial, sans-serif;\n}"
			);

			loadProject();
			fileManager.currentFile = "manifest.json";
			fileManager.updateFileTree();
			document.getElementById("fileLabel").textContent = fileManager.currentFile;
			editor.setValue(fileManager.getFile(fileManager.currentFile));
		} catch (e) {
			console.error("Project initialization failed:", e);
		}
	}

	// Tab switching
	function showTab(tabName) {
		try {
			document
				.querySelectorAll(".tab-container")
				.forEach((tab) => tab.classList.remove("active"));
			document.getElementById(`${tabName}-tab`).classList.add("active");

			document
				.querySelectorAll(".sidebar-nav-item")
				.forEach((item) => item.classList.remove("active"));
			document.getElementById(`${tabName}Tab`).classList.add("active");
		} catch (e) {
			console.error("Tab switching failed:", e);
		}
	}

	// Toggle section visibility
	function toggleSection() {
		try {
			this.classList.toggle("collapsed");
			const content = this.nextElementSibling;
			content.classList.toggle("collapsed");
		} catch (e) {
			console.error("Section toggle failed:", e);
		}
	}

	// Update preview pane
	function updatePreview() {
		try {
			const fileName = fileManager.currentFile;
			const content = editor.getValue();
			const iframe = document.getElementById("preview");
			const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

			iframeDoc.open();

			if (fileName.endsWith(".html")) {
				iframeDoc.write(content);
			} else if (fileName.endsWith(".json")) {
				try {
					const jsonObj = JSON.parse(content);
					iframeDoc.write(`
                        <html>
                        <head>
                            <style>
                                body { font-family: sans-serif; padding: 20px; }
                                .json-key { color: #0077aa; }
                                .json-value { color: #669900; }
                                .json-string { color: #aa5500; }
                            </style>
                        </head>
                        <body>
                            <h2>Manifest Preview</h2>
                            <pre>${formatJSON(content)}</pre>
                        </body>
                        </html>
                    `);
				} catch (e) {
					throw new Error(`Invalid JSON: ${e.message}`);
				}
			} else if (fileName.endsWith(".css")) {
				iframeDoc.write(`
                    <html>
                    <head>
                        <style>${content}</style>
                    </head>
                    <body>
                        <h2>CSS Preview</h2>
                        <div style="padding: 20px;">Sample content styled with your CSS</div>
                    </body>
                    </html>
                `);
			} else {
				iframeDoc.write(`
                    <html>
                    <head>
                        <style>
                            body { font-family: monospace; padding: 20px; white-space: pre; }
                        </style>
                    </head>
                    <body>${sanitizeInput(content)}</body>
                    </html>
                `);
			}

			iframeDoc.close();
		} catch (error) {
			handleError(error, "Preview Update");
		}
	}

	// Format JSON for display
	function formatJSON(json) {
		try {
			return sanitizeInput(json).replace(
				/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
				(match) => {
					let cls = "json-value";
					if (/^"/.test(match)) {
						cls = /:$/.test(match) ? "json-key" : "json-string";
					}
					return `<span class="${cls}">${match}</span>`;
				}
			);
		} catch (e) {
			console.error("JSON formatting failed:", e);
			return json;
		}
	}

	// Error handling
	function handleError(error, context) {
		console.error(`Error in ${context}:`, error);
		showError(`Error in ${context}: ${error.message}`);
	}

	// Show error in preview
	function showError(message) {
		try {
			const iframe = document.getElementById("preview");
			const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
			iframeDoc.open();
			iframeDoc.write(`
                <html>
                <head>
                    <style>
                        body { font-family: sans-serif; padding: 20px; }
                        .error { color: #dc3545; }
                    </style>
                </head>
                <body>
                    <h2 class="error">Error</h2>
                    <p class="error">${sanitizeInput(message)}</p>
                </body>
                </html>
            `);
			iframeDoc.close();
		} catch (e) {
			console.error("Error display failed:", e);
		}
	}

	// Input sanitization
	function sanitizeInput(input) {
		try {
			if (typeof input !== "string") return "";
			return input.replace(
				/[&<>"']/g,
				(match) =>
					({
						"&": "&",
						"<": "<",
						">": ">",
						"'": "'"
					}[match])
			);
		} catch (e) {
			console.error("Sanitization failed:", e);
			return "";
		}
	}

	// Persistence
	function saveProject() {
		try {
			const projectData = {
				files: Object.fromEntries(fileManager.files),
				settings: {
					autosave: document.getElementById("autosave").value,
					theme: document.getElementById("theme").value,
					defaultName: document.getElementById("default-name").value,
					defaultVersion: document.getElementById("default-version").value
				}
			};
			localStorage.setItem("extensionBuilder", JSON.stringify(projectData));
		} catch (error) {
			handleError(error, "Project Save");
		}
	}

	function loadProject() {
		try {
			const savedData = localStorage.getItem("extensionBuilder");
			if (savedData) {
				const projectData = JSON.parse(savedData);
				fileManager.files = new Map(Object.entries(projectData.files));
				if (projectData.settings) {
					document.getElementById("autosave").value =
						projectData.settings.autosave || "30";
					document.getElementById("theme").value =
						projectData.settings.theme || "light";
					document.getElementById("default-name").value =
						projectData.settings.defaultName || "My Chrome Extension";
					document.getElementById("default-version").value =
						projectData.settings.defaultVersion || "1.0.0";
				}
				fileManager.updateFileTree();
			}
		} catch (error) {
			handleError(error, "Project Load");
		}
	}

	// Download extension
	function downloadExtension() {
		try {
			const zip = new JSZip();
			fileManager.files.forEach((content, name) => {
				zip.file(name, content);
			});

			zip.generateAsync({ type: "blob" }).then((blob) => {
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = "extension.zip";
				a.click();
				URL.revokeObjectURL(url);
			});
		} catch (error) {
			handleError(error, "Extension Download");
		}
	}

	// Add new file
	function addNewFile() {
		try {
			const name = prompt(
				"Enter file name (must end with .js, .html, .css, or .json):"
			);
			if (name && fileManager.validateFileName(name)) {
				fileManager.addFile(name, "");
				saveProject();
			} else {
				throw new Error("Invalid file name or type");
			}
		} catch (error) {
			handleError(error, "Add New File");
		}
	}

	// Analysis Logic
	function runAnalysis() {
		try {
			const manifestContent = fileManager.getFile("manifest.json");
			const analysisResults = {
				manifest: [],
				security: [],
				performance: []
			};

			// Manifest Validation
			let manifest;
			try {
				manifest = JSON.parse(manifestContent);
				analysisResults.manifest.push({
					status: "good",
					title: "Valid JSON Format",
					description: "The manifest.json file is properly formatted JSON."
				});
			} catch (e) {
				analysisResults.manifest.push({
					status: "error",
					title: "Invalid JSON",
					description: `The manifest.json file contains invalid JSON: ${e.message}`
				});
				updateAnalysisUI(analysisResults);
				return;
			}

			// Required fields
			const requiredFields = ["manifest_version", "name", "version"];
			requiredFields.forEach((field) => {
				if (!manifest[field]) {
					analysisResults.manifest.push({
						status: "error",
						title: `Missing ${field}`,
						description: `The manifest.json must include a "${field}" field.`
					});
				}
			});

			// Manifest version
			if (manifest.manifest_version !== 3) {
				analysisResults.manifest.push({
					status: "warning",
					title: "Manifest Version",
					description: "Use manifest_version: 3 for modern Chrome extensions."
				});
			}

			// Recommended fields
			const recommendedFields = ["description", "icons", "author", "homepage_url"];
			recommendedFields.forEach((field) => {
				if (!manifest[field]) {
					analysisResults.manifest.push({
						status: "warning",
						title: `Missing ${field}`,
						description: `Consider adding a "${field}" field to improve extension metadata.`
					});
				}
			});

			// Validate icons if present
			if (manifest.icons) {
				const requiredIconSizes = ["16", "48", "128"];
				requiredIconSizes.forEach((size) => {
					if (!manifest.icons[size]) {
						analysisResults.manifest.push({
							status: "warning",
							title: `Missing Icon Size ${size}`,
							description: `Include a ${size}x${size} icon for better compatibility.`
						});
					} else if (!fileManager.files.has(manifest.icons[size])) {
						analysisResults.manifest.push({
							status: "error",
							title: `Missing Icon File ${manifest.icons[size]}`,
							description: `The icon file ${manifest.icons[size]} is referenced but not found in the project.`
						});
					}
				});
			}

			// Security Analysis
			if (manifest.permissions) {
				const dangerousPermissions = [
					"tabs",
					"activeTab",
					"scripting",
					"webRequest"
				];
				manifest.permissions.forEach((perm) => {
					if (dangerousPermissions.includes(perm)) {
						analysisResults.security.push({
							status: "warning",
							title: `Potentially Dangerous Permission: ${perm}`,
							description: `The "${perm}" permission is powerful. Ensure it's necessary and used securely.`
						});
					}
				});

				if (manifest.permissions.length > 5) {
					analysisResults.security.push({
						status: "warning",
						title: "Excessive Permissions",
						description:
							"The extension requests many permissions. Minimize permissions to improve security and user trust."
					});
				}
			}

			if (!manifest.content_security_policy) {
				analysisResults.security.push({
					status: "warning",
					title: "Missing Content Security Policy",
					description:
						"Add a Content Security Policy to restrict resource loading and prevent XSS attacks."
				});
			} else {
				const csp = manifest.content_security_policy;
				if (typeof csp === "string" && csp.includes("unsafe-eval")) {
					analysisResults.security.push({
						status: "error",
						title: "Unsafe CSP",
						description:
							'The CSP includes "unsafe-eval", which can lead to security vulnerabilities.'
					});
				}
			}

			const popupContent = fileManager.getFile("popup.html") || "";
			if (
				popupContent.includes('<script src="http') ||
				popupContent.includes('<script src="//')
			) {
				analysisResults.security.push({
					status: "error",
					title: "External Scripts Detected",
					description:
						"Avoid loading external scripts in popup.html to prevent security risks."
				});
			}

			// Performance Analysis
			fileManager.files.forEach((content, name) => {
				const sizeInKB = (new TextEncoder().encode(content).length / 1024).toFixed(
					2
				);
				if (sizeInKB > 100) {
					analysisResults.performance.push({
						status: "warning",
						title: `Large File: ${name}`,
						description: `The file ${name} is ${sizeInKB}KB. Consider optimizing to improve loading performance.`
					});
				}
			});

			const jsFiles = Array.from(fileManager.files.keys()).filter((name) =>
				name.endsWith(".js")
			);
			jsFiles.forEach((name) => {
				const content = fileManager.getFile(name);
				if (content.length > 1000 && !content.includes("\n")) {
					analysisResults.performance.push({
						status: "warning",
						title: `Unminified JavaScript: ${name}`,
						description: `The file ${name} appears unminified. Consider minifying to reduce size.`
					});
				}
			});

			updateAnalysisUI(analysisResults);
		} catch (error) {
			handleError(error, "Analysis");
		}
	}

	function updateAnalysisUI(results) {
		try {
			const manifestAnalysis = document.getElementById("manifest-analysis");
			const securityAnalysis = document.getElementById("security-analysis");
			const performanceAnalysis = document.createElement("div");
			performanceAnalysis.id = "performance-analysis";

			manifestAnalysis.innerHTML = results.manifest
				.map(
					(item) => `
                <div class="seo-item ${item.status}">
                    <i class="fas fa-${
																					item.status === "good"
																						? "check-circle"
																						: item.status === "warning"
																						? "exclamation-triangle"
																						: "times-circle"
																				}"></i>
                    <div class="seo-item-content">
                        <div class="seo-item-title">${sanitizeInput(
																									item.title
																								)}</div>
                        <div class="seo-item-description">${sanitizeInput(
																									item.description
																								)}</div>
                    </div>
                </div>
            `
				)
				.join("");

			securityAnalysis.innerHTML = results.security
				.map(
					(item) => `
                <div class="seo-item ${item.status}">
                    <i class="fas fa-${
																					item.status === "good"
																						? "check-circle"
																						: item.status === "warning"
																						? "exclamation-triangle"
																						: "times-circle"
																				}"></i>
                    <div class="seo-item-content">
                        <div class="seo-item-title">${sanitizeInput(
																									item.title
																								)}</div>
                        <div class="seo-item-description">${sanitizeInput(
																									item.description
																								)}</div>
                    </div>
                </div>
            `
				)
				.join("");

			if (results.performance.length > 0) {
				const existingPerformanceCard = document.querySelector(
					"#performance-analysis"
				);
				if (existingPerformanceCard) {
					existingPerformanceCard.remove();
				}

				const performanceCard = document.createElement("div");
				performanceCard.className = "analysis-card";
				performanceCard.innerHTML = `
                    <h3><i class="fas fa-tachometer-alt"></i> Performance Analysis</h3>
                    <div id="performance-analysis">
                        ${results.performance
																									.map(
																										(item) => `
                            <div class="seo-item ${item.status}">
                                <i class="fas fa-${
																																	item.status === "good"
																																		? "check-circle"
																																		: item.status === "warning"
																																		? "exclamation-triangle"
																																		: "times-circle"
																																}"></i>
                                <div class="seo-item-content">
                                    <div class="seo-item-title">${sanitizeInput(
																																					item.title
																																				)}</div>
                                    <div class="seo-item-description">${sanitizeInput(
																																					item.description
																																				)}</div>
                                </div>
                            </div>
                        `
																									)
																									.join("")}
                    </div>
                `;
				document
					.querySelector(".analysis-content")
					.insertBefore(performanceCard, document.querySelector(".button-group"));
			}
		} catch (e) {
			console.error("Analysis UI update failed:", e);
		}
	}

	function exportReport() {
		try {
			const manifestAnalysis = document.getElementById("manifest-analysis")
				.innerHTML;
			const securityAnalysis = document.getElementById("security-analysis")
				.innerHTML;
			const performanceAnalysis =
				document.getElementById("performance-analysis")?.innerHTML || "";

			const reportContent = `
                <html>
                <head>
                    <title>Extension Analysis Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        .analysis-card { margin-bottom: 20px; }
                        .seo-item { margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #eee; }
                        .seo-item.good { color: #28a745; }
                        .seo-item.warning { color: #ffc107; }
                        .seo-item.error { color: #dc3545; }
                        .seo-item-title { font-weight: bold; }
                        .seo-item-description { font-size: 0.9em; }
                    </style>
                </head>
                <body>
                    <h1>Extension Analysis Report</h1>
                    <div class="analysis-card">
                        <h2>Manifest Validation</h2>
                        ${manifestAnalysis}
                    </div>
                    <div class="analysis-card">
                        <h2>Security Check</h2>
                        ${securityAnalysis}
                    </div>
                    ${
																					performanceAnalysis
																						? `
                    <div class="analysis-card">
                        <h2>Performance Analysis</h2>
                        ${performanceAnalysis}
                    </div>`
																						: ""
																				}
                </body>
                </html>
            `;

			const blob = new Blob([reportContent], { type: "text/html" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "extension-analysis-report.html";
			a.click();
			URL.revokeObjectURL(url);
		} catch (error) {
			handleError(error, "Export Report");
		}
	}

	// Keyboard shortcuts
	function handleKeyboardShortcuts(event) {
		try {
			if (event.ctrlKey || event.metaKey) {
				switch (event.key) {
					case "s":
						event.preventDefault();
						saveProject();
						break;
					case "p":
						event.preventDefault();
						updatePreview();
						break;
					case "n":
						event.preventDefault();
						addNewFile();
						break;
					case "r":
						event.preventDefault();
						if (
							document.getElementById("analysis-tab").classList.contains("active")
						) {
							runAnalysis();
						}
						break;
				}
			}
		} catch (e) {
			console.error("Keyboard shortcut handling failed:", e);
		}
	}

	// Autosave
	function setupAutosave() {
		try {
			const autosaveInput = document.getElementById("autosave");
			let autosaveInterval;

			function updateAutosave() {
				clearInterval(autosaveInterval);
				const interval = parseInt(autosaveInput.value) * 1000;
				if (interval > 0) {
					autosaveInterval = setInterval(saveProject, interval);
				}
			}

			autosaveInput.addEventListener("change", () => {
				updateAutosave();
				saveProject();
			});

			updateAutosave();
		} catch (e) {
			console.error("Autosave setup failed:", e);
		}
	}

	// Event listeners
	function setupEventListeners() {
    try {
        document.getElementById("editorTab").addEventListener("click", () => showTab("editor"));
			document.getElementById("analysisTab").addEventListener("click", () => {
				showTab("analysis");
				runAnalysis();
			});
			document
				.getElementById("settingsTab")
				.addEventListener("click", () => showTab("settings"));

			document
				.getElementById("assetsSection")
				.addEventListener("click", toggleSection);

			document
				.getElementById("updatePreview")
				.addEventListener("click", updatePreview);
			document
				.getElementById("refreshPreview")
				.addEventListener("click", updatePreview);
			document.getElementById("saveFile").addEventListener("click", saveProject);
			document
				.getElementById("downloadExt")
				.addEventListener("click", downloadExtension);
			document.getElementById("addNewFile").addEventListener("click", addNewFile);

			document
				.getElementById("runAnalysis")
				.addEventListener("click", runAnalysis);
			document
				.getElementById("exportReport")
				.addEventListener("click", exportReport);

			document
				.getElementById("saveSettings")
				.addEventListener("click", saveProject);
			document.getElementById("resetSettings").addEventListener("click", () => {
				document.getElementById("autosave").value = "30";
				document.getElementById("theme").value = "light";
				document.getElementById("default-name").value = "My Chrome Extension";
				document.getElementById("default-version").value = "1.0.0";
				saveProject();
			});

			const keydownHandler = (event) => handleKeyboardShortcuts(event);
        document.addEventListener("keydown", keydownHandler);
        window.addEventListener("unload", () => document.removeEventListener("keydown", keydownHandler));
    } catch (e) {
        console.error("Event listener setup failed:", e);
        showError(`Event listener setup failed: ${e.message}`);
    }
}

function handleKeyboardShortcuts(event) {
    try {
        if ((event.ctrlKey || event.metaKey) && !["INPUT", "TEXTAREA"].includes(event.target.tagName)) {
            switch (event.key) {
                case "s":
                    event.preventDefault();
                    saveProject();
                    showNotification("Project saved!");
                    break;
                case "p":
                    event.preventDefault();
                    updatePreview();
                    showNotification("Preview updated!");
                    break;
                case "n":
                    event.preventDefault();
                    addNewFile();
                    showNotification("New file added!");
                    break;
                case "r":
                    event.preventDefault();
                    if (document.getElementById("analysis-tab").classList.contains("active")) {
                        runAnalysis();
                        showNotification("Analysis completed!");
                    }
                    break;
                case "d":
                    event.preventDefault();
                    downloadExtension();
                    showNotification("Extension downloaded!");
                    break;
                case "t":
                    event.preventDefault();
                    const tabs = ["editor", "analysis", "settings"];
                    const currentTab = tabs.find(tab => document.getElementById(`${tab}-tab`).classList.contains("active"));
                    const nextTab = tabs[(tabs.indexOf(currentTab) + 1) % tabs.length];
                    showTab(nextTab);
                    showNotification(`Switched to ${nextTab} tab`);
                    break;
            }
        }
    } catch (e) {
        console.error("Keyboard shortcut handling failed:", e);
        showError(`Keyboard shortcut error: ${e.message}`);
    }
}

function showNotification(message) {
    const notification = document.createElement("div");
    notification.textContent = message;
    notification.style.position = "fixed";
    notification.style.bottom = "20px";
    notification.style.right = "20px";
    notification.style.background = "#28a745";
    notification.style.color = "white";
    notification.style.padding = "10px";
    notification.style.borderRadius = "4px";
    notification.style.zIndex = "1000";
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
}

	// Initialize editor mode based on file type
	fileManager.updateEditorMode = function () {
		try {
			const fileName = this.currentFile;
			const mode =
				Object.entries(this.supportedTypes).find(([ext]) =>
					fileName.endsWith(ext)
				)?.[1] || "javascript";
			editor.setOption("mode", mode);
		} catch (e) {
			console.error("Editor mode update failed:", e);
		}
	};

	// Initialize everything
	try {
		initializeEditor();
		initializeProject();
		setupEventListeners();
		setupAutosave();
		updatePreview();
	} catch (error) {
		handleError(error, "Initialization");
	}
});
