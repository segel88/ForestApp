/* ForestApp PWA - Main Application with IndexedDB */

console.log('🚀 Loading app.js...');

// ⚠️ ⚠️ ⚠️ SOSTITUISCI QUESTO URL CON IL TUO GOOGLE APPS SCRIPT URL ⚠️ ⚠️ ⚠️
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzNuHQtZdmne2vvcm_AR18kSesQVemwnElm_XhhTymKTBxZclC1NtAns7KVv4xgfRcLQw/exec';

console.log('✅ Constants loaded');

// App State - Enhanced for multi-project support
let appState = {
    isOnline: navigator.onLine,
    operatorName: '',
    currentProjectId: null,
    currentSampleArea: 'area1',
    selectedSpeciesForHeight: null,
    selectedSpeciesForInventory: null,
    inventoryAreaHa: 30.0,
    
    // Current tree being measured in sample area
    currentSampleTree: null,
    
    // Sample areas data structure
    sampleAreas: {
        area1: { completeTrees: [] },
        area2: { completeTrees: [] },
        area3: { completeTrees: [] },
        area4: { completeTrees: [] },
        area5: { completeTrees: [] }
    },
    
    // Inventory trees (piedilista)
    inventoryTrees: [],
    
    // Calculated averages
    speciesHeightAverages: {},
    
    gpsLocation: null,
    lastSync: null
};

// Species Configuration - Same as before
const SPECIES_CONFIG = {
    'pino-domestico': {
        name: 'Pino Domestico',
        scientific: 'Pinus pinea',
        formFactor: 0.45
    },
    'pino-marittimo': {
        name: 'Pino Marittimo',
        scientific: 'Pinus pinaster',
        formFactor: 0.42
    },
    'pino-aleppo': {
        name: "Pino d'Aleppo",
        scientific: 'Pinus halepensis',
        formFactor: 0.40
    },
    'cipresso': {
        name: 'Cipresso Comune',
        scientific: 'Cupressus sempervirens',
        formFactor: 0.48
    },
    'altro': {
        name: 'Altro',
        scientific: 'Altre specie',
        formFactor: 0.45
    }
};

// Global instances
let forestDB = null;
let projectManager = null;

// Initialize App
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 DOMContentLoaded event fired');
    console.log('🔍 Current switchTab type:', typeof switchTab);
    console.log('🔍 Current window.switchTab type:', typeof window.switchTab);
    try {
        console.log('🔄 Starting ForestApp initialization...');
        showNotification('🔄 Inizializzazione ForestApp...', 'info');
        
        // Initialize database
        console.log('🔄 Initializing database...');
        forestDB = await initializeDatabase();
        console.log('✅ Database initialized');
        
        // Initialize project manager
        console.log('🔄 Initializing project manager...');
        projectManager = await initializeProjectManager(forestDB);
        console.log('✅ Project manager initialized');
        
        // Initialize app
        console.log('🔄 Initializing app...');
        initializeApp();
        console.log('🔄 Setting up event listeners...');
        setupEventListeners();
        console.log('🔄 Setting up button debugging...');
        debugButtonSetup();
        console.log('🔄 Starting geolocation...');
        startGeoLocation();
        console.log('🔄 Setting up offline detection...');
        setupOfflineDetection();
        
        // Get operator name if not set
        appState.operatorName = await forestDB.getSetting('operatorName');
        if (!appState.operatorName) {
            appState.operatorName = prompt('Inserisci il tuo nome:') || 'Operatore';
            await forestDB.setSetting('operatorName', appState.operatorName);
        }
        
        // Check if URL is configured
        if (GOOGLE_APPS_SCRIPT_URL === 'IL_TUO_URL_QUI') {
            document.getElementById('configAlert').style.display = 'block';
        } else {
            document.getElementById('configAlert').style.display = 'none';
        }
        
        // Update UI
        updateAllUI();
        updateProjectSelector();
        
        showNotification('✅ ForestApp inizializzato con successo!', 'success');
        
    } catch (error) {
        console.error('❌ App initialization failed:', error);
        showNotification('❌ Errore nell\'inizializzazione dell\'app', 'error');
    }
});

// Tab Switching - Same as before but with database save
function switchTab(tabName) {
    console.log('🔄 switchTab called with:', tabName);
    
    // Save current session before switching
    if (projectManager) {
        console.log('💾 Saving current session...');
        projectManager.saveCurrentSession();
    } else {
        console.log('⚠️ No projectManager available');
    }
    
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    console.log('✅ Hidden all tab contents');
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    console.log('✅ Removed active class from all tab buttons');
    
    // Show selected tab content
    const targetTab = document.getElementById(tabName);
    if (targetTab) {
        targetTab.classList.add('active');
        console.log('✅ Activated tab:', tabName);
    } else {
        console.error('❌ Target tab not found:', tabName);
    }
    
    // Add active class to the correct button
    const targetButton = document.querySelector(`[onclick*="switchTab('${tabName}')"]`);
    if (targetButton) {
        targetButton.classList.add('active');
        console.log('✅ Activated button for tab:', tabName);
    } else {
        console.error('❌ Target button not found for tab:', tabName);
    }
    
    // Update UI based on current tab
    console.log('🔄 Updating UI...');
    updateAllUI();
    console.log('✅ switchTab completed for:', tabName);
}

// Project Management Functions
async function createNewProject() {
    const name = prompt('Nome del nuovo progetto:');
    if (!name) return;
    
    const description = prompt('Descrizione (opzionale):') || '';
    const location = prompt('Località (opzionale):') || '';
    
    try {
        const projectData = {
            name: name.trim(),
            description: description.trim(),
            operator: appState.operatorName,
            inventoryAreaHa: 30.0,
            location: location.trim()
        };
        
        const projectId = await projectManager.createProject(projectData);
        await projectManager.setCurrentProject(projectId);
        updateProjectSelector();
        updateAllUI();
    } catch (error) {
        showNotification('❌ Errore nella creazione del progetto', 'error');
    }
}

async function switchToProject(projectId) {
    try {
        showNotification('🔄 Caricamento progetto...', 'info');
        await projectManager.setCurrentProject(parseInt(projectId));
        updateProjectSelector();
        updateAllUI();
        showNotification('✅ Progetto caricato con successo!', 'success');
    } catch (error) {
        showNotification('❌ Errore nel caricamento del progetto', 'error');
    }
}

async function deleteCurrentProject() {
    if (!projectManager.currentProject) return;
    
    const confirmDelete = confirm(`Sei sicuro di voler eliminare il progetto "${projectManager.currentProject.name}"?\n\nQuesta azione eliminerà TUTTI i dati del progetto e non può essere annullata.`);
    if (!confirmDelete) return;
    
    try {
        await projectManager.deleteProject(projectManager.currentProject.id);
        updateProjectSelector();
        updateAllUI();
    } catch (error) {
        showNotification('❌ Errore nell\'eliminazione del progetto', 'error');
    }
}

async function exportCurrentProject() {
    if (!projectManager.currentProject) return;
    
    const format = confirm('Esportare come JSON (OK) o CSV (Annulla)?') ? 'json' : 'csv';
    await projectManager.exportProject(projectManager.currentProject.id, format);
}

async function importProject() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            showNotification('🔄 Importazione in corso...', 'info');
            await projectManager.importProject(file);
            updateProjectSelector();
            updateAllUI();
        } catch (error) {
            // Error already handled in project manager
        }
    };
    
    input.click();
}

function updateProjectSelector() {
    const selector = document.getElementById('projectSelector');
    if (!selector) return;
    
    const projects = projectManager.getProjectsForUI();
    
    selector.innerHTML = projects.map(project => 
        `<option value="${project.id}" ${project.isActive ? 'selected' : ''}>
            ${project.name} (${project.formattedDate})
        </option>`
    ).join('');
}

// Sample Area Functions - Enhanced with database operations
function selectSampleArea(areaId) {
    appState.currentSampleArea = areaId;
    document.getElementById('currentArea').textContent = `Area ${areaId.slice(-1)}`;
    updateSampleAreaUI();
}

function selectSpeciesForHeight(species) {
    appState.selectedSpeciesForHeight = species;
    
    // Reset current tree measurement
    appState.currentSampleTree = null;
    
    // Update UI for sample area
    document.querySelectorAll('#sample-area .species-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    document.querySelector(`#sample-area [data-species="${species}"]`).classList.add('selected');
    
    // Enable diameter buttons, disable height buttons until diameter is selected
    document.querySelectorAll('#sample-area .add-tree-btn').forEach(btn => {
        btn.disabled = false;
    });
    
    document.querySelectorAll('#sample-area .add-height-btn').forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
    });
    
    updateSampleAreaStatus();
    showNotification(`Specie selezionata: ${SPECIES_CONFIG[species].name}. Ora seleziona il diametro.`, 'info');
}

function addSampleTree(diameterClass) {
    if (!appState.selectedSpeciesForHeight) {
        showNotification('Seleziona prima una specie!', 'error');
        return;
    }

    // Create a new tree measurement in progress
    appState.currentSampleTree = {
        id: Date.now() + Math.random(),
        area: appState.currentSampleArea,
        species: appState.selectedSpeciesForHeight,
        diameterClass: diameterClass,
        height: null,
        needsHeight: true,
        timestamp: new Date().toISOString(),
        operator: appState.operatorName,
        gps: appState.gpsLocation ? {
            lat: appState.gpsLocation.latitude,
            lng: appState.gpsLocation.longitude,
            accuracy: appState.gpsLocation.accuracy
        } : null
    };

    // Disable diameter buttons and enable height buttons
    document.querySelectorAll('#sample-area .add-tree-btn').forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
    });
    
    document.querySelectorAll('#sample-area .add-height-btn').forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.innerHTML = `<span>📏</span><span>Altezza per Ø${diameterClass}cm</span>`;
    });

    updateSampleAreaStatus();
    
    const speciesName = SPECIES_CONFIG[appState.selectedSpeciesForHeight].name;
    showNotification(`Diametro ${diameterClass}cm registrato per ${speciesName}. Ora misura l'altezza.`, 'info');
}

async function addHeightMeasurement(height) {
    if (!appState.currentSampleTree) {
        showNotification('Seleziona prima il diametro di una pianta!', 'error');
        return;
    }

    if (!projectManager.currentProject) {
        showNotification('❌ Nessun progetto attivo!', 'error');
        return;
    }

    try {
        // Complete the tree measurement
        appState.currentSampleTree.height = height;
        appState.currentSampleTree.needsHeight = false;
        appState.currentSampleTree.heightTimestamp = new Date().toISOString();

        // Save to database
        await forestDB.addSampleTree(projectManager.currentProject.id, appState.currentSampleTree);

        // Add to local state
        const currentArea = appState.sampleAreas[appState.currentSampleArea];
        if (!currentArea.completeTrees) {
            currentArea.completeTrees = [];
        }
        currentArea.completeTrees.push(appState.currentSampleTree);

        // Reset current tree
        appState.currentSampleTree = null;

        // Re-enable diameter buttons for next tree
        document.querySelectorAll('#sample-area .add-tree-btn').forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
        });

        // Disable height buttons until next diameter
        document.querySelectorAll('#sample-area .add-height-btn').forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.innerHTML = `<span>📏</span><span>Altezza</span>`;
        });

        // Recalculate averages and save
        calculateSpeciesHeightAverages();
        await forestDB.saveHeightAverages(projectManager.currentProject.id, appState.speciesHeightAverages);
        
        updateSampleAreaUI();
        updateInventoryUI();
        
        const speciesName = SPECIES_CONFIG[appState.selectedSpeciesForHeight].name;
        const lastTree = currentArea.completeTrees[currentArea.completeTrees.length - 1];
        showNotification(`✅ Pianta salvata: ${speciesName} Ø${lastTree.diameterClass}cm H${height}m`, 'success');
        
    } catch (error) {
        console.error('❌ Error adding height measurement:', error);
        showNotification('❌ Errore nel salvare la pianta', 'error');
    }
}

// Inventory Functions - Enhanced with database operations
function selectSpeciesForInventory(species) {
    appState.selectedSpeciesForInventory = species;
    
    // Update UI for inventory
    document.querySelectorAll('#inventory .species-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    document.querySelector(`#inventory [data-species="${species}"]`).classList.add('selected');
    
    // Enable diameter buttons
    document.querySelectorAll('#inventory .add-tree-btn').forEach(btn => {
        btn.disabled = false;
    });
    
    showNotification(`Specie selezionata per piedilista: ${SPECIES_CONFIG[species].name}`, 'info');
}

async function addInventoryTree(diameterClass) {
    if (!appState.selectedSpeciesForInventory) {
        showNotification('Seleziona prima una specie!', 'error');
        return;
    }

    if (!projectManager.currentProject) {
        showNotification('❌ Nessun progetto attivo!', 'error');
        return;
    }

    try {
        const inventoryTree = {
            id: Date.now() + Math.random(),
            species: appState.selectedSpeciesForInventory,
            diameterClass: diameterClass,
            timestamp: new Date().toISOString(),
            gps: appState.gpsLocation ? {
                lat: appState.gpsLocation.latitude,
                lng: appState.gpsLocation.longitude,
                accuracy: appState.gpsLocation.accuracy
            } : null,
            operator: appState.operatorName
        };

        // Save to database
        await forestDB.addInventoryTree(projectManager.currentProject.id, inventoryTree);

        // Add to local state
        appState.inventoryTrees.push(inventoryTree);
        
        updateInventoryUI();
        updateResultsUI();
        
        const speciesName = SPECIES_CONFIG[appState.selectedSpeciesForInventory].name;
        showNotification(`✅ Salvata: ${speciesName} - Classe ${diameterClass}cm`, 'success');
        
    } catch (error) {
        console.error('❌ Error adding inventory tree:', error);
        showNotification('❌ Errore nel salvare la pianta', 'error');
    }
}

async function updateInventoryArea() {
    const newArea = parseFloat(document.getElementById('inventoryAreaHa').value);
    appState.inventoryAreaHa = newArea;
    
    // Update project in database
    if (projectManager.currentProject) {
        try {
            await projectManager.updateProject(projectManager.currentProject.id, {
                inventoryAreaHa: newArea
            });
        } catch (error) {
            console.error('❌ Error updating area:', error);
        }
    }
    
    updateInventoryUI();
    updateResultsUI();
}

// Calculation Functions - Same as before
function calculateSpeciesHeightAverages() {
    appState.speciesHeightAverages = {};
    
    const speciesHeights = {};
    
    try {
        Object.values(appState.sampleAreas).forEach(area => {
            if (area && Array.isArray(area.completeTrees)) {
                area.completeTrees.forEach(tree => {
                    if (tree && tree.height && tree.height > 0 && tree.species) {
                        if (!speciesHeights[tree.species]) {
                            speciesHeights[tree.species] = [];
                        }
                        speciesHeights[tree.species].push(tree.height);
                    }
                });
            }
        });
        
        Object.entries(speciesHeights).forEach(([species, heights]) => {
            if (heights.length > 0) {
                const average = heights.reduce((sum, height) => sum + height, 0) / heights.length;
                appState.speciesHeightAverages[species] = {
                    average: average,
                    count: heights.length,
                    min: Math.min(...heights),
                    max: Math.max(...heights)
                };
            }
        });
        
        console.log('📊 Height averages calculated:', appState.speciesHeightAverages);
    } catch (error) {
        console.error('❌ Error calculating height averages:', error);
        appState.speciesHeightAverages = {};
    }
}

function calculateTreeBasalArea(diameterClass) {
    const diameter = diameterClass;
    return Math.PI * Math.pow(diameter / 200, 2);
}

function calculateTreeVolume(species, diameterClass) {
    const basalArea = calculateTreeBasalArea(diameterClass);
    const speciesConfig = SPECIES_CONFIG[species];
    
    if (appState.speciesHeightAverages[species]) {
        const avgHeight = appState.speciesHeightAverages[species].average;
        return basalArea * avgHeight * speciesConfig.formFactor;
    }
    
    return 0;
}

function calculateSampleTreeVolume(species, diameterClass, height) {
    const basalArea = calculateTreeBasalArea(diameterClass);
    const speciesConfig = SPECIES_CONFIG[species];
    return basalArea * height * speciesConfig.formFactor;
}

function getTotalVolume() {
    return appState.inventoryTrees.reduce((total, tree) => {
        return total + calculateTreeVolume(tree.species, tree.diameterClass);
    }, 0);
}

function getTotalBasalArea() {
    return appState.inventoryTrees.reduce((total, tree) => {
        return total + calculateTreeBasalArea(tree.diameterClass);
    }, 0);
}

// UI Update Functions - Enhanced
function updateAllUI() {
    updateHeaderStats();
    updateSampleAreaUI();
    updateInventoryUI();
    updateResultsUI();
    updateProjectInfo();
}

function updateProjectInfo() {
    const projectInfo = document.getElementById('projectInfo');
    if (!projectInfo) return;
    
    if (projectManager && projectManager.currentProject) {
        const project = projectManager.currentProject;
        projectInfo.innerHTML = `
            <strong>${project.name}</strong>
            <small> - ${project.operator} - ${project.inventoryAreaHa} ha</small>
        `;
    }
}

function updateHeaderStats() {
    const allCompleteTrees = Object.values(appState.sampleAreas).reduce((total, area) => {
        return total + (area.completeTrees ? area.completeTrees.length : 0);
    }, 0);
    
    const speciesWithHeights = Object.keys(appState.speciesHeightAverages).length;
    const totalVolume = getTotalVolume();
    
    document.getElementById('totalSampleTrees').textContent = allCompleteTrees;
    document.getElementById('totalInventoryTrees').textContent = appState.inventoryTrees.length;
    document.getElementById('speciesWithHeights').textContent = `${speciesWithHeights}/5`;
    document.getElementById('totalVolume').textContent = totalVolume.toFixed(1) + ' m³';
}

// Rest of the UI functions remain the same as in the original app.js
// [Including updateSampleAreaUI, updateInventoryUI, updateResultsUI, etc.]

// Delete Functions - Enhanced with database operations
async function deleteSampleTree(treeId) {
    if (!confirm('Sei sicuro di voler eliminare questa pianta di saggio?')) return;
    
    try {
        // Remove from database
        await forestDB.deleteSampleTree(treeId);
        
        // Remove from local state
        Object.values(appState.sampleAreas).forEach(area => {
            area.completeTrees = area.completeTrees.filter(tree => tree.id != treeId);
        });
        
        // Recalculate averages
        calculateSpeciesHeightAverages();
        if (projectManager.currentProject) {
            await forestDB.saveHeightAverages(projectManager.currentProject.id, appState.speciesHeightAverages);
        }
        
        updateSampleAreaUI();
        updateInventoryUI();
        showNotification('✅ Pianta di saggio eliminata', 'success');
        
    } catch (error) {
        console.error('❌ Error deleting sample tree:', error);
        showNotification('❌ Errore nell\'eliminazione', 'error');
    }
}

async function deleteInventoryTree(treeId) {
    if (!confirm('Sei sicuro di voler eliminare questa pianta dal piedilista?')) return;
    
    try {
        // Remove from database
        await forestDB.deleteInventoryTree(treeId);
        
        // Remove from local state
        appState.inventoryTrees = appState.inventoryTrees.filter(tree => tree.id != treeId);
        
        updateInventoryUI();
        updateResultsUI();
        showNotification('✅ Pianta eliminata dal piedilista', 'success');
        
    } catch (error) {
        console.error('❌ Error deleting inventory tree:', error);
        showNotification('❌ Errore nell\'eliminazione', 'error');
    }
}

async function clearInventoryData() {
    if (appState.inventoryTrees.length === 0) {
        showNotification('Nessun dato del piedilista da eliminare', 'info');
        return;
    }

    if (!confirm(`Sei sicuro di voler eliminare tutte le ${appState.inventoryTrees.length} piante del piedilista?`)) return;

    try {
        // Clear from database
        if (projectManager.currentProject) {
            await forestDB.deleteInventoryTreesByProject(projectManager.currentProject.id);
        }
        
        // Clear local state
        appState.inventoryTrees = [];
        appState.selectedSpeciesForInventory = null;
        
        // Reset UI
        document.querySelectorAll('#inventory .species-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.querySelectorAll('#inventory .add-tree-btn').forEach(btn => {
            btn.disabled = true;
        });
        
        updateInventoryUI();
        updateResultsUI();
        showNotification('✅ Piedilista pulito', 'success');
        
    } catch (error) {
        console.error('❌ Error clearing inventory:', error);
        showNotification('❌ Errore nella pulizia', 'error');
    }
}

// Complete remaining UI functions
function updateSampleAreaUI() {
    const currentArea = appState.sampleAreas[appState.currentSampleArea];
    
    const treeCount = currentArea.completeTrees ? currentArea.completeTrees.length : 0;
    document.getElementById('sampleTreeCount').textContent = 
        `${treeCount} pianta${treeCount !== 1 ? 'e' : ''} completa${treeCount !== 1 ? 'e' : ''}`;
    
    updateRecentSampleTrees(currentArea.completeTrees || []);
    updateHeightAveragesDisplay();
    updateSampleAreaStatus();
}

function updateRecentSampleTrees(completeTrees) {
    const container = document.getElementById('recentSampleTrees');
    
    if (completeTrees.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                Nessuna pianta completa rilevata ancora.<br>
                Seleziona una specie e completa diametro + altezza per la prima pianta!
            </div>
        `;
        return;
    }

    const recentTrees = completeTrees.slice(-20).reverse();
    
    const treesHTML = recentTrees.map(tree => {
        const speciesConfig = SPECIES_CONFIG[tree.species];
        const timestamp = new Date(tree.timestamp);
        const gpsText = tree.gps ? 
            `GPS: ${tree.gps.lat.toFixed(4)}, ${tree.gps.lng.toFixed(4)}` : 
            'GPS non disponibile';
        
        const basalArea = calculateTreeBasalArea(tree.diameterClass);
        const volume = calculateSampleTreeVolume(tree.species, tree.diameterClass, tree.height);
        
        return `
            <div class="entry-item">
                <div class="entry-info">
                    <div class="entry-species">${speciesConfig.name}</div>
                    <div class="entry-details">
                        Ø${tree.diameterClass}cm × H${tree.height}m • ${tree.area.toUpperCase()}<br>
                        Area basim.: ${basalArea.toFixed(4)} m² • Volume: ${volume.toFixed(3)} m³<br>
                        <small>${gpsText}</small>
                    </div>
                    <div class="entry-timestamp">
                        ${timestamp.toLocaleString()}
                    </div>
                </div>
                <button class="delete-btn" onclick="deleteSampleTree('${tree.id}')">
                    🗑️
                </button>
            </div>
        `;
    }).join('');

    container.innerHTML = treesHTML;
}

function updateHeightAveragesDisplay() {
    const container = document.getElementById('averagesList');
    
    if (Object.keys(appState.speciesHeightAverages).length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Nessuna altezza rilevata ancora</p>';
        return;
    }
    
    const averagesHTML = Object.entries(appState.speciesHeightAverages).map(([species, data]) => {
        const speciesConfig = SPECIES_CONFIG[species];
        return `
            <div class="avg-item">
                <div class="avg-species">${speciesConfig.name}</div>
                <div class="avg-height">
                    ${data.average.toFixed(1)}m 
                    <small style="color: var(--text-secondary);">(${data.count} campioni)</small>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = averagesHTML;
}

function updateSampleAreaStatus() {
    const statusDiv = document.getElementById('sampleAreaStatus') || createSampleAreaStatus();
    
    if (appState.currentSampleTree) {
        statusDiv.innerHTML = `
            <div style="background: #fef3c7; padding: 1rem; border-radius: 0.75rem; border: 2px solid #f59e0b; margin: 1rem 0;">
                <h4 style="color: #92400e; margin-bottom: 0.5rem;">🌲 Pianta in Misurazione</h4>
                <p style="color: #78350f;">
                    <strong>${SPECIES_CONFIG[appState.currentSampleTree.species].name}</strong><br>
                    Diametro: ${appState.currentSampleTree.diameterClass}cm<br>
                    <strong>⏳ Aspettando misurazione altezza...</strong>
                </p>
            </div>
        `;
    } else {
        statusDiv.innerHTML = `
            <div style="background: #f0fdf4; padding: 1rem; border-radius: 0.75rem; border: 2px solid #16a34a; margin: 1rem 0;">
                <h4 style="color: #15803d; margin-bottom: 0.5rem;">✅ Pronto per Nuova Pianta</h4>
                <p style="color: #166534;">
                    ${appState.selectedSpeciesForHeight ? 
                        `Specie selezionata: <strong>${SPECIES_CONFIG[appState.selectedSpeciesForHeight].name}</strong><br>Clicca su una classe diametrica per iniziare` :
                        'Seleziona una specie per iniziare il rilevamento'
                    }
                </p>
            </div>
        `;
    }
}

function createSampleAreaStatus() {
    const statusDiv = document.createElement('div');
    statusDiv.id = 'sampleAreaStatus';
    
    const speciesSelector = document.querySelector('#sample-area .species-selector');
    if (speciesSelector) {
        speciesSelector.parentNode.insertBefore(statusDiv, speciesSelector.nextSibling);
    }
    
    return statusDiv;
}

function updateInventoryUI() {
    document.getElementById('inventoryTreeCount').textContent = 
        `${appState.inventoryTrees.length} pianta${appState.inventoryTrees.length !== 1 ? 'e' : ''}`;
    
    updateRecentInventoryTrees();
    updateSpeciesHeightStatus();
    updateVolumeWarning();
}

function updateRecentInventoryTrees() {
    const container = document.getElementById('recentInventoryTrees');
    
    if (appState.inventoryTrees.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                Nessuna pianta del piedilista rilevata ancora.<br>
                Seleziona una specie e inizia il conteggio!
            </div>
        `;
        return;
    }

    const recentTrees = appState.inventoryTrees.slice(-20).reverse();
    
    const treesHTML = recentTrees.map(tree => {
        const speciesConfig = SPECIES_CONFIG[tree.species];
        const timestamp = new Date(tree.timestamp);
        const gpsText = tree.gps ? 
            `GPS: ${tree.gps.lat.toFixed(4)}, ${tree.gps.lng.toFixed(4)}` : 
            'GPS non disponibile';
        
        const volume = calculateTreeVolume(tree.species, tree.diameterClass);
        const volumeText = volume > 0 ? `Vol: ${volume.toFixed(3)} m³` : 'Vol: N/A (no altezza)';
        
        return `
            <div class="entry-item">
                <div class="entry-info">
                    <div class="entry-species">${speciesConfig.name}</div>
                    <div class="entry-details">
                        Classe ${tree.diameterClass}cm • ${volumeText} • ${gpsText}
                    </div>
                    <div class="entry-timestamp">
                        ${timestamp.toLocaleString()}
                    </div>
                </div>
                <button class="delete-btn" onclick="deleteInventoryTree('${tree.id}')">
                    🗑️
                </button>
            </div>
        `;
    }).join('');

    container.innerHTML = treesHTML;
}

function updateSpeciesHeightStatus() {
    Object.keys(SPECIES_CONFIG).forEach(species => {
        const statusElement = document.getElementById(`height-status-${species}`);
        if (statusElement) {
            if (appState.speciesHeightAverages[species]) {
                const avg = appState.speciesHeightAverages[species].average;
                statusElement.textContent = `✅ H: ${avg.toFixed(1)}m`;
                statusElement.style.color = '#16a34a';
            } else {
                statusElement.textContent = '⚠️ No altezza';
                statusElement.style.color = '#d97706';
            }
        }
    });
}

function updateVolumeWarning() {
    const warningElement = document.getElementById('volumeWarning');
    
    const speciesInInventory = [...new Set(appState.inventoryTrees.map(tree => tree.species))];
    const speciesWithoutHeights = speciesInInventory.filter(species => 
        !appState.speciesHeightAverages[species]
    );
    
    if (speciesWithoutHeights.length > 0 && appState.inventoryTrees.length > 0) {
        warningElement.style.display = 'block';
    } else {
        warningElement.style.display = 'none';
    }
}

function updateResultsUI() {
    const totalArea = appState.inventoryAreaHa;
    const totalTrees = appState.inventoryTrees.length;
    const treesPerHa = totalArea > 0 ? Math.round(totalTrees / totalArea) : 0;
    const totalBasalArea = getTotalBasalArea();
    const basalAreaHa = totalArea > 0 ? totalBasalArea / totalArea : 0;
    const totalVolume = getTotalVolume();
    const volumeHa = totalArea > 0 ? totalVolume / totalArea : 0;

    document.getElementById('totalAreaHa').textContent = totalArea.toFixed(1) + ' ha';
    document.getElementById('treesPerHaResult').textContent = treesPerHa;
    document.getElementById('basalAreaHa').textContent = basalAreaHa.toFixed(2) + ' m²/ha';
    document.getElementById('volumeHa').textContent = volumeHa.toFixed(1) + ' m³/ha';

    updateSpeciesAnalysis();
    updateHeightAnalysis();
}

function updateSpeciesAnalysis() {
    const container = document.getElementById('speciesAnalysis');
    
    if (appState.inventoryTrees.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">Nessun dato da analizzare ancora</div>';
        return;
    }

    const speciesStats = {};
    appState.inventoryTrees.forEach(tree => {
        if (!speciesStats[tree.species]) {
            speciesStats[tree.species] = {
                count: 0,
                basalArea: 0,
                volume: 0,
                diameterClasses: {}
            };
        }
        speciesStats[tree.species].count++;
        speciesStats[tree.species].basalArea += calculateTreeBasalArea(tree.diameterClass);
        speciesStats[tree.species].volume += calculateTreeVolume(tree.species, tree.diameterClass);
        
        if (!speciesStats[tree.species].diameterClasses[tree.diameterClass]) {
            speciesStats[tree.species].diameterClasses[tree.diameterClass] = 0;
        }
        speciesStats[tree.species].diameterClasses[tree.diameterClass]++;
    });

    const analysisHTML = Object.entries(speciesStats).map(([species, stats]) => {
        const speciesConfig = SPECIES_CONFIG[species];
        const percentage = ((stats.count / appState.inventoryTrees.length) * 100).toFixed(1);
        const hasHeight = appState.speciesHeightAverages[species] ? '✅' : '⚠️';
        const avgHeight = appState.speciesHeightAverages[species] ? 
            appState.speciesHeightAverages[species].average.toFixed(1) + 'm' : 'N/A';
        
        const diameterDistribution = Object.entries(stats.diameterClasses)
            .map(([diam, count]) => `${count}×${diam}cm`)
            .join(', ');
        
        return `
            <div class="entry-item">
                <div class="entry-info">
                    <div class="entry-species">${hasHeight} ${speciesConfig.name}</div>
                    <div class="entry-details">
                        ${stats.count} piante (${percentage}%) • H media: ${avgHeight}<br>
                        Area basim.: ${stats.basalArea.toFixed(2)} m² • Volume: ${stats.volume.toFixed(1)} m³<br>
                        <small>Distribuzione: ${diameterDistribution}</small>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = analysisHTML;
}

function updateHeightAnalysis() {
    const container = document.getElementById('heightAnalysis');
    
    if (Object.keys(appState.speciesHeightAverages).length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">Nessuna area di saggio rilevata ancora</div>';
        return;
    }

    const analysisHTML = Object.entries(appState.speciesHeightAverages).map(([species, data]) => {
        const speciesConfig = SPECIES_CONFIG[species];
        
        return `
            <div class="entry-item">
                <div class="entry-info">
                    <div class="entry-species">${speciesConfig.name}</div>
                    <div class="entry-details">
                        Media: ${data.average.toFixed(1)}m • Min: ${data.min.toFixed(1)}m • Max: ${data.max.toFixed(1)}m<br>
                        Campioni: ${data.count} altezze misurate
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = analysisHTML;
}

// GPS and Location Functions
function startGeoLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
            position => {
                appState.gpsLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: new Date()
                };
                console.log('📍 GPS aggiornato:', appState.gpsLocation);
            },
            error => {
                console.error('❌ GPS Error:', error);
                showNotification('GPS non disponibile - Continua senza geolocalizzazione', 'info');
            },
            { 
                enableHighAccuracy: true, 
                maximumAge: 30000, 
                timeout: 10000 
            }
        );
    } else {
        console.warn('Geolocation non supportata');
        showNotification('Geolocalizzazione non supportata dal browser', 'info');
    }
}

// Offline Detection
function setupOfflineDetection() {
    window.addEventListener('online', () => {
        appState.isOnline = true;
        updateConnectionStatus();
        showNotification('Connessione ripristinata!', 'success');
    });
    
    window.addEventListener('offline', () => {
        appState.isOnline = false;
        updateConnectionStatus();
        showNotification('Modalità offline attiva', 'info');
    });
    
    updateConnectionStatus();
}

function updateConnectionStatus() {
    const statusElement = document.getElementById('connectionStatus');
    const iconElement = document.getElementById('statusIcon');
    const textElement = document.getElementById('statusText');

    if (appState.isOnline) {
        statusElement.className = 'status-item status-online';
        iconElement.textContent = '🟢';
        textElement.textContent = 'Online';
    } else {
        statusElement.className = 'status-item status-offline';
        iconElement.textContent = '🔴';
        textElement.textContent = 'Offline';
    }
}

// Event Listeners Setup
function setupEventListeners() {
    document.addEventListener('keydown', (event) => {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT') return;
        
        if (event.key === '1') switchTab('sample-area');
        if (event.key === '2') switchTab('inventory');
        if (event.key === '3') switchTab('results');
        
        if (event.ctrlKey && event.key === 's') {
            event.preventDefault();
            exportCurrentProject();
        }
        if (event.ctrlKey && event.key === 'e') {
            event.preventDefault();
            exportAllData();
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            console.log('App in background - Saving state...');
            if (projectManager) {
                projectManager.saveCurrentSession();
            }
        } else {
            console.log('App restored - Updating UI...');
            updateAllUI();
        }
    });

    window.addEventListener('beforeunload', (event) => {
        if (projectManager) {
            projectManager.saveCurrentSession();
        }
    });
}

// Export Functions
async function exportAllData() {
    if (!projectManager || !projectManager.currentProject) {
        showNotification('❌ Nessun progetto attivo da esportare', 'error');
        return;
    }
    
    await exportCurrentProject();
}

// Optional Google Sheets sync function
async function saveToGoogleSheetsOptional() {
    if (!projectManager || !projectManager.currentProject) {
        showNotification('❌ Nessun progetto attivo da sincronizzare', 'error');
        return;
    }

    if (GOOGLE_APPS_SCRIPT_URL === 'IL_TUO_URL_QUI') {
        showNotification('⚠️ URL Google Apps Script non configurato', 'warning');
        return;
    }

    if (!appState.isOnline) {
        showNotification('❌ Connessione Internet richiesta per Google Sheets', 'error');
        return;
    }

    const confirmSync = confirm('Sincronizzare i dati del progetto corrente con Google Sheets?\n\nQuesta operazione invierà tutti i dati del progetto al foglio di calcolo.');
    if (!confirmSync) return;

    try {
        showNotification('🔄 Sincronizzazione con Google Sheets...', 'info');

        // Get project data
        const projectData = await forestDB.exportProject(projectManager.currentProject.id);
        
        // Prepare data for Google Sheets (same format as before)
        const dataToSave = {
            timestamp: new Date().toISOString(),
            operator: projectData.project.operator,
            inventoryAreaHa: projectData.project.inventoryAreaHa,
            totalSampleTrees: projectData.sampleTrees.length,
            totalInventoryTrees: projectData.inventoryTrees.length,
            totalVolume: getTotalVolume(),
            speciesHeightAverages: projectData.heightAverages,
            sampleTrees: projectData.sampleTrees,
            heightMeasurements: projectData.sampleTrees.map(tree => ({
                id: tree.id + '_height',
                area: tree.area,
                species: tree.species,
                height: tree.height,
                timestamp: tree.timestamp,
                operator: tree.operator,
                gps: tree.gps
            })),
            inventoryTrees: projectData.inventoryTrees,
            projectInfo: {
                name: projectData.project.name,
                description: projectData.project.description,
                location: projectData.project.location
            },
            isOptionalSync: true
        };

        // Use the improved form submission with better timeout handling
        const result = await submitViaFormImproved(dataToSave);
        
        if (result) {
            showNotification('✅ Dati sincronizzati con Google Sheets!', 'success');
        }

    } catch (error) {
        console.error('❌ Error syncing with Google Sheets:', error);
        
        if (error.message.includes('Timeout') || error.message.includes('timeout')) {
            showNotification('⚠️ Connessione lenta: i dati potrebbero essere sincronizzati. Controlla Google Sheets.', 'warning');
        } else {
            showNotification(`❌ Errore sincronizzazione: ${error.message}`, 'error');
        }
    }
}

// Improved form submission for Google Sheets (same as before but renamed)
function submitViaFormImproved(data) {
    return new Promise((resolve, reject) => {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = GOOGLE_APPS_SCRIPT_URL;
        form.target = 'hidden_iframe';
        form.style.display = 'none';
        
        const iframe = document.createElement('iframe');
        iframe.name = 'hidden_iframe';
        iframe.style.display = 'none';
        
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'data';
        input.value = JSON.stringify(data);
        
        form.appendChild(input);
        document.body.appendChild(form);
        document.body.appendChild(iframe);
        
        let isResolved = false;
        
        // Increased timeout to 30 seconds for slow connections
        const timeout = setTimeout(() => {
            if (!isResolved) {
                console.log('⏰ Timeout raggiunto, ma i dati potrebbero essere ancora in fase di invio...');
                showNotification('Invio in corso... Connessione lenta rilevata. I dati verranno salvati.', 'info');
                
                // Give more time for slow connections
                setTimeout(() => {
                    if (!isResolved) {
                        cleanup();
                        reject(new Error('Timeout prolungato: operazione non completata in 50 secondi'));
                    }
                }, 20000); // Additional 20 seconds = 50 seconds total
            }
        }, 30000);
        
        iframe.onload = function() {
            if (!isResolved) {
                isResolved = true;
                clearTimeout(timeout);
                cleanup();
                resolve(true);
            }
        };
        
        iframe.onerror = function() {
            if (!isResolved) {
                isResolved = true;
                clearTimeout(timeout);
                cleanup();
                reject(new Error('Errore di connessione con Google Sheets'));
            }
        };
        
        function cleanup() {
            if (form.parentNode) form.parentNode.removeChild(form);
            if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }
        
        form.submit();
        console.log('📤 Form inviato a Google Sheets, attesa risposta...');
    });
}

// Generate Report Function
async function generateReport() {
    if (!projectManager || !projectManager.currentProject) {
        showNotification('❌ Nessun progetto attivo per il report', 'error');
        return;
    }

    try {
        const projectData = await forestDB.exportProject(projectManager.currentProject.id);
        const project = projectData.project;
        
        const stats = await projectManager.getProjectStats(project.id);
        
        const reportHTML = `
            <h2>📊 Report Rilevamento Forestale</h2>
            <h3>Progetto: ${project.name}</h3>
            <hr>
            <p><strong>Operatore:</strong> ${project.operator}</p>
            <p><strong>Data:</strong> ${new Date().toLocaleDateString('it-IT')}</p>
            <p><strong>Località:</strong> ${project.location || 'Non specificata'}</p>
            <p><strong>Area Totale:</strong> ${project.inventoryAreaHa} ha</p>
            <hr>
            
            <h3>Riassunto Dati:</h3>
            <ul>
                <li>Piante di Saggio: ${stats.sampleTrees}</li>
                <li>Piante Piedilista: ${stats.inventoryTrees}</li>
                <li>Specie con Altezze: ${stats.speciesWithHeights}/5</li>
                <li>Volume Totale: ${stats.totalVolume.toFixed(1)} m³</li>
                <li>Volume per Ettaro: ${stats.volumePerHa.toFixed(1)} m³/ha</li>
                <li>Area Basimetrica: ${stats.totalBasalArea.toFixed(2)} m²</li>
                <li>Area Basimetrica per Ettaro: ${stats.basalAreaPerHa.toFixed(2)} m²/ha</li>
                <li>Piante per Ettaro: ${stats.treesPerHa}</li>
            </ul>
            
            <h3>Altezze Medie:</h3>
            <ul>
                ${Object.entries(projectData.heightAverages).map(([species, data]) => 
                    `<li>${SPECIES_CONFIG[species].name}: ${data.average.toFixed(1)}m (${data.count} campioni)</li>`
                ).join('')}
            </ul>
            
            <hr>
            <p><em>Report generato da ForestApp Pro v2.0 il ${new Date().toLocaleString('it-IT')}</em></p>
        `;

        // Open report in new window
        const reportWindow = window.open('', '_blank');
        reportWindow.document.write(`
            <html>
            <head>
                <title>Report Forestale - ${project.name}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
                    h2, h3 { color: #16a34a; }
                    hr { border: 1px solid #e2e8f0; margin: 20px 0; }
                    ul { padding-left: 20px; }
                    li { margin: 5px 0; }
                </style>
            </head>
            <body>
                ${reportHTML}
            </body>
            </html>
        `);
        reportWindow.document.close();
        
        showNotification('📊 Report generato in nuova finestra!', 'success');
        
    } catch (error) {
        console.error('❌ Error generating report:', error);
        showNotification('❌ Errore nella generazione del report', 'error');
    }
}

// Utility Functions
function initializeApp() {
    console.log('🌲 ForestApp Pro v2 initialized');
    console.log('📱 PWA Ready with IndexedDB');
    console.log('🔧 Version: 2.0.0 - Multi-Project');
    
    if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        console.log('📱 Mobile device detected');
        document.body.classList.add('mobile-device');
    }
    
    if ('performance' in window) {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const loadTime = performance.now();
                console.log(`⚡ App loaded in ${loadTime.toFixed(2)}ms`);
            }, 0);
        });
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    console.log(`🔔 [${type.toUpperCase()}] ${message}`);
    
    const container = document.getElementById('notifications');
    if (!container) {
        console.error('Notification container not found');
        return;
    }
    
    container.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    
    const hideDelay = type === 'error' ? 6000 : 4000;
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, hideDelay);
}

// Performance optimization
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

const debouncedUpdateUI = debounce(updateAllUI, 150);

// Debug function to test button functionality
function debugButtonSetup() {
    console.log('🔧 Setting up button debugging...');
    
    // Check if tab buttons exist
    const tabButtons = document.querySelectorAll('.tab-btn');
    console.log('🔍 Found tab buttons:', tabButtons.length);
    
    tabButtons.forEach((btn, index) => {
        const onclick = btn.getAttribute('onclick');
        console.log(`🔍 Button ${index + 1} onclick:`, onclick);
        
        // Add a test click listener
        btn.addEventListener('click', function(e) {
            console.log('🖱️ Button clicked!', onclick);
            console.log('🔍 switchTab function available:', typeof window.switchTab);
        });
    });
    
    // Test if we can manually call switchTab
    try {
        console.log('🧪 Testing switchTab function directly...');
        if (typeof window.switchTab === 'function') {
            console.log('✅ switchTab is available as function');
        } else {
            console.error('❌ switchTab is not available:', typeof window.switchTab);
        }
    } catch (error) {
        console.error('❌ Error testing switchTab:', error);
    }
}

// Global error handlers
window.addEventListener('error', (event) => {
    console.error('🚨 Global error:', event.error);
    if (typeof showNotification === 'function') {
        showNotification('Si è verificato un errore. Controlla la console per dettagli.', 'error');
    }
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 Unhandled promise rejection:', event.reason);
    if (typeof showNotification === 'function') {
        showNotification('Errore di connessione. Riprova più tardi.', 'error');
    }
});

// Make functions globally available for onclick handlers
console.log('🔄 Exposing functions globally...');

window.switchTab = switchTab;
console.log('✅ window.switchTab =', typeof window.switchTab);

window.selectSpeciesForHeight = selectSpeciesForHeight;
window.selectSpeciesForInventory = selectSpeciesForInventory;
window.addSampleTree = addSampleTree;
window.addInventoryTree = addInventoryTree;
window.addHeightMeasurement = addHeightMeasurement;
window.switchToProject = switchToProject;
window.selectSampleArea = selectSampleArea;
window.updateInventoryArea = updateInventoryArea;
window.clearInventoryData = clearInventoryData;
window.createNewProject = createNewProject;
window.exportCurrentProject = exportCurrentProject;
window.importProject = importProject;
window.deleteCurrentProject = deleteCurrentProject;
window.exportAllData = exportAllData;
window.generateReport = generateReport;
window.saveToGoogleSheetsOptional = saveToGoogleSheetsOptional;

console.log('✅ All functions exposed globally');
console.log('🔍 Testing switchTab availability:', typeof switchTab);
console.log('🔍 Testing window.switchTab availability:', typeof window.switchTab);

console.log('🎯 ForestApp Pro v2 - IndexedDB Multi-Project version loaded successfully!');