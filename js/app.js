// ForestApp - Simplified Clean Version

// Available emoji options for species
const EMOJI_OPTIONS = {
    'conifers': ['🌲', '🌿', '🎄'],
    'deciduous': ['🌳', '🌴', '🍃'],
    'colored': ['🟢', '🔵', '🔴', '🟡', '🟠', '🟣'],
    'special': ['🌾', '🪴', '🌱', '🍀', '🌵', '🎋']
};

// Current project species (will be populated from project data)
let SPECIES = {};

// Project species list for creation form
let projectSpeciesList = [];

// App state
let app = {
    currentProject: null,
    projects: [],
    currentTab: 'sample',
    currentArea: 1,
    totalArea: 30,
    sampleTrees: [],
    inventoryTrees: [],
    heightAverages: {},
    selectedSpeciesSample: null,
    selectedSpeciesInventory: null,
    currentSampleTree: null,
    addingSpeciesFor: null // 'sample' or 'inventory'
};

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    console.log('🌲 ForestApp starting...');
    
    loadProjects();
    setupProjectEventListeners();
    updateProjectsUI();
    
    console.log('✅ ForestApp ready!');
});

// Event listeners
function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });

    // Sample area selector
    document.getElementById('area-selector').addEventListener('change', (e) => {
        app.currentArea = parseInt(e.target.value);
        updateUI();
    });

    // Total area input
    document.getElementById('total-area').addEventListener('change', (e) => {
        app.totalArea = parseFloat(e.target.value);
        saveData();
        updateUI();
    });

    // Species event listeners will be set up by setupSpeciesEventListeners()
    setupSpeciesEventListeners();

    // Diameter buttons - Sample
    document.querySelectorAll('#sample-tab .diameter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!btn.disabled) {
                selectDiameter('sample', parseInt(btn.dataset.diameter));
            }
        });
    });

    // Diameter buttons - Inventory
    document.querySelectorAll('#inventory-tab .diameter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!btn.disabled) {
                addInventoryTree(parseInt(btn.dataset.diameter));
            }
        });
    });

    // Height buttons
    document.querySelectorAll('.height-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!btn.disabled) {
                completeSampleTree(parseFloat(btn.dataset.height));
            }
        });
    });

    // Action buttons
    document.getElementById('clear-inventory').addEventListener('click', clearInventory);
    document.getElementById('new-project').addEventListener('click', newProject);
    document.getElementById('export-data').addEventListener('click', exportData);
    document.getElementById('clear-all').addEventListener('click', clearAll);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        
        switch(e.key) {
            case '1':
                switchTab('sample');
                break;
            case '2':
                switchTab('inventory');
                break;
            case '3':
                switchTab('results');
                break;
        }
    });
}

// Tab switching
function switchTab(tabName) {
    console.log('Switching to tab:', tabName);
    
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });

    // Update tab content
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const targetTab = document.getElementById(`${tabName}-tab`);
    if (targetTab) {
        targetTab.classList.add('active');
        app.currentTab = tabName;
    }

    updateUI();
}

// Species selection
function selectSpecies(type, species) {
    if (type === 'sample') {
        app.selectedSpeciesSample = species;
        
        // Update UI
        document.querySelectorAll('#sample-species-buttons .species-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        const sampleBtn = document.querySelector(`#sample-species-buttons [data-species="${species}"]`);
        if (sampleBtn) sampleBtn.classList.add('selected');
        
        // Enable diameter buttons
        document.querySelectorAll('#sample-tab .diameter-btn').forEach(btn => {
            btn.disabled = false;
        });
        
        // Enable custom diameter button
        document.getElementById('custom-diameter-sample-btn').disabled = false;
        
        showNotification(`Specie selezionata: ${SPECIES[species].name}`, 'info');
        
    } else if (type === 'inventory') {
        app.selectedSpeciesInventory = species;
        
        // Update UI
        document.querySelectorAll('#inventory-species-buttons .species-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        const inventoryBtn = document.querySelector(`#inventory-species-buttons [data-species="${species}"]`);
        if (inventoryBtn) inventoryBtn.classList.add('selected');
        
        // Enable diameter buttons
        document.querySelectorAll('#inventory-tab .diameter-btn.inventory').forEach(btn => {
            btn.disabled = false;
        });
        
        // Enable custom diameter button
        document.getElementById('custom-diameter-inventory-btn').disabled = false;
        
        showNotification(`Specie selezionata: ${SPECIES[species].name}`, 'info');
    }

    updateUI();
}

// Sample tree workflow
function selectDiameter(type, diameter) {
    if (!app.selectedSpeciesSample) {
        showNotification('Seleziona prima una specie!', 'error');
        return;
    }

    // Create new sample tree
    app.currentSampleTree = {
        id: Date.now(),
        area: app.currentArea,
        species: app.selectedSpeciesSample,
        diameter: diameter,
        height: null,
        timestamp: new Date()
    };

    // Show height input
    document.getElementById('height-input').style.display = 'block';
    
    // Disable diameter buttons and custom diameter button
    document.querySelectorAll('#sample-tab .diameter-btn').forEach(btn => {
        btn.disabled = true;
    });
    
    const customBtn = document.getElementById('custom-diameter-sample-btn');
    if (customBtn) customBtn.disabled = true;

    updateSampleStatus(`Diametro ${diameter}cm selezionato. Ora seleziona l'altezza.`, 'info');
}

function completeSampleTree(height) {
    if (!app.currentSampleTree) {
        showNotification('Errore: nessun albero in corso', 'error');
        return;
    }

    // Complete the tree
    app.currentSampleTree.height = height;
    app.sampleTrees.push(app.currentSampleTree);

    // Calculate averages
    calculateHeightAverages();

    // Reset for next tree
    document.getElementById('height-input').style.display = 'none';
    document.querySelectorAll('#sample-tab .diameter-btn').forEach(btn => {
        btn.disabled = false;
    });
    
    // Re-enable custom diameter button if species is selected
    if (app.selectedSpeciesSample) {
        const customBtn = document.getElementById('custom-diameter-sample-btn');
        if (customBtn) customBtn.disabled = false;
    }

    const speciesName = SPECIES[app.currentSampleTree.species].name;
    showNotification(`✅ Salvato: ${speciesName} Ø${app.currentSampleTree.diameter}cm H${height}m`, 'success');

    app.currentSampleTree = null;
    saveData();
    updateUI();
}

// Inventory tree
function addInventoryTree(diameter) {
    if (!app.selectedSpeciesInventory) {
        showNotification('Seleziona prima una specie!', 'error');
        return;
    }

    const tree = {
        id: Date.now(),
        species: app.selectedSpeciesInventory,
        diameter: diameter,
        timestamp: new Date()
    };

    app.inventoryTrees.push(tree);
    
    const speciesName = SPECIES[app.selectedSpeciesInventory].name;
    showNotification(`✅ Aggiunto: ${speciesName} Ø${diameter}cm`, 'success');

    saveData();
    updateUI();
}

// Calculations
function calculateHeightAverages() {
    app.heightAverages = {};
    
    const speciesHeights = {};
    
    app.sampleTrees.forEach(tree => {
        if (!speciesHeights[tree.species]) {
            speciesHeights[tree.species] = [];
        }
        speciesHeights[tree.species].push(tree.height);
    });

    Object.entries(speciesHeights).forEach(([species, heights]) => {
        if (heights.length > 0) {
            const avg = heights.reduce((sum, h) => sum + h, 0) / heights.length;
            app.heightAverages[species] = {
                average: avg,
                count: heights.length,
                min: Math.min(...heights),
                max: Math.max(...heights)
            };
        }
    });
}

function calculateTreeVolume(species, diameter) {
    const basalArea = Math.PI * Math.pow(diameter / 200, 2); // m²
    const speciesData = SPECIES[species];
    
    if (!speciesData) return 0;
    
    // Use default height from species if available, otherwise try sample averages
    let height = 0;
    if (speciesData.defaultHeight) {
        height = speciesData.defaultHeight;
    } else if (app.heightAverages[species]) {
        height = app.heightAverages[species].average;
    }
    
    if (height > 0) {
        return basalArea * height * speciesData.formFactor;
    }
    return 0;
}

function getTotalVolume() {
    return app.inventoryTrees.reduce((total, tree) => {
        return total + calculateTreeVolume(tree.species, tree.diameter);
    }, 0);
}

function getTotalBasalArea() {
    return app.inventoryTrees.reduce((total, tree) => {
        return total + Math.PI * Math.pow(tree.diameter / 200, 2);
    }, 0);
}

// UI Updates
function updateUI() {
    updateHeaderStats();
    updateSampleList();
    updateInventoryList();
    updateResults();
}

function updateHeaderStats() {
    document.getElementById('sample-count').textContent = app.sampleTrees.length;
    document.getElementById('inventory-count').textContent = app.inventoryTrees.length;
    document.getElementById('volume-total').textContent = getTotalVolume().toFixed(1);
}

function updateSampleList() {
    const container = document.getElementById('sample-list');
    
    if (app.sampleTrees.length === 0) {
        container.innerHTML = '<p class="empty">Nessuna pianta di saggio ancora</p>';
        return;
    }

    const recentTrees = app.sampleTrees.slice(-10).reverse();
    
    container.innerHTML = recentTrees.map(tree => `
        <div class="tree-item">
            <div class="tree-info">
                <div class="tree-species">${SPECIES[tree.species].name}</div>
                <div class="tree-details">
                    Ø${tree.diameter}cm × H${tree.height}m • Area ${tree.area}
                    <br>Volume: ${(Math.PI * Math.pow(tree.diameter / 200, 2) * tree.height * SPECIES[tree.species].formFactor).toFixed(3)} m³
                </div>
            </div>
            <button class="delete-btn" onclick="deleteSampleTree('${tree.id}')">🗑️</button>
        </div>
    `).join('');
}

function updateInventoryList() {
    const container = document.getElementById('inventory-list');
    
    if (app.inventoryTrees.length === 0) {
        container.innerHTML = '<p class="empty">Nessuna pianta in piedilista</p>';
        return;
    }

    const recentTrees = app.inventoryTrees.slice(-10).reverse();
    
    container.innerHTML = recentTrees.map(tree => {
        const volume = calculateTreeVolume(tree.species, tree.diameter);
        const volumeText = volume > 0 ? `${volume.toFixed(3)} m³` : 'N/A';
        
        return `
            <div class="tree-item">
                <div class="tree-info">
                    <div class="tree-species">${SPECIES[tree.species].name}</div>
                    <div class="tree-details">
                        Ø${tree.diameter}cm • Vol: ${volumeText}
                    </div>
                </div>
                <button class="delete-btn" onclick="deleteInventoryTree('${tree.id}')">🗑️</button>
            </div>
        `;
    }).join('');
}

function updateResults() {
    // Update stats
    const totalTrees = app.inventoryTrees.length;
    const treesPerHa = app.totalArea > 0 ? Math.round(totalTrees / app.totalArea) : 0;
    const basalArea = getTotalBasalArea();
    const volume = getTotalVolume();
    const volumePerHa = app.totalArea > 0 ? volume / app.totalArea : 0;

    document.getElementById('total-trees').textContent = totalTrees;
    document.getElementById('trees-per-ha').textContent = treesPerHa;
    document.getElementById('basal-area').textContent = basalArea.toFixed(2);
    document.getElementById('volume-per-ha').textContent = volumePerHa.toFixed(1);

    // Update height averages
    updateHeightAverages();
    updateSpeciesAnalysis();
}

function updateHeightAverages() {
    const container = document.getElementById('height-averages');
    
    if (Object.keys(app.heightAverages).length === 0) {
        container.innerHTML = '<p class="empty">Nessuna altezza rilevata</p>';
        return;
    }

    container.innerHTML = Object.entries(app.heightAverages).map(([species, data]) => `
        <div class="height-item">
            <div class="tree-info">
                <div class="tree-species">${SPECIES[species].name}</div>
                <div class="tree-details">
                    Media: ${data.average.toFixed(1)}m (${data.count} campioni)
                    <br>Range: ${data.min.toFixed(1)} - ${data.max.toFixed(1)}m
                </div>
            </div>
        </div>
    `).join('');
}

function updateSpeciesAnalysis() {
    const container = document.getElementById('species-analysis');
    
    if (app.inventoryTrees.length === 0) {
        container.innerHTML = '<p class="empty">Nessun dato da analizzare</p>';
        return;
    }

    const speciesData = {};
    
    app.inventoryTrees.forEach(tree => {
        if (!speciesData[tree.species]) {
            speciesData[tree.species] = { count: 0, volume: 0 };
        }
        speciesData[tree.species].count++;
        speciesData[tree.species].volume += calculateTreeVolume(tree.species, tree.diameter);
    });

    container.innerHTML = Object.entries(speciesData).map(([species, data]) => {
        const percentage = ((data.count / app.inventoryTrees.length) * 100).toFixed(1);
        const hasHeight = app.heightAverages[species] ? '✅' : '⚠️';
        
        return `
            <div class="species-item">
                <div class="tree-info">
                    <div class="tree-species">${hasHeight} ${SPECIES[species].name}</div>
                    <div class="tree-details">
                        ${data.count} piante (${percentage}%) • Volume: ${data.volume.toFixed(1)} m³
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateSampleStatus(message, type) {
    const container = document.getElementById('sample-status');
    container.className = `status-message ${type}`;
    container.textContent = message;
}

// Delete functions
function deleteSampleTree(treeId) {
    if (!confirm('Eliminare questa pianta di saggio?')) return;
    
    app.sampleTrees = app.sampleTrees.filter(tree => tree.id != treeId);
    calculateHeightAverages();
    saveData();
    updateUI();
    showNotification('Pianta eliminata', 'success');
}

function deleteInventoryTree(treeId) {
    if (!confirm('Eliminare questa pianta dalla piedilista?')) return;
    
    app.inventoryTrees = app.inventoryTrees.filter(tree => tree.id != treeId);
    saveData();
    updateUI();
    showNotification('Pianta eliminata', 'success');
}

// Action functions
function clearInventory() {
    if (app.inventoryTrees.length === 0) {
        showNotification('Piedilista già vuota', 'info');
        return;
    }
    
    if (!confirm(`Eliminare tutte le ${app.inventoryTrees.length} piante della piedilista?`)) return;
    
    app.inventoryTrees = [];
    app.selectedSpeciesInventory = null;
    
    // Reset UI
    document.querySelectorAll('#inventory-species-buttons .species-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    document.querySelectorAll('#inventory-tab .diameter-btn').forEach(btn => {
        btn.disabled = true;
    });
    
    // Disable custom diameter button
    const customBtn = document.getElementById('custom-diameter-inventory-btn');
    if (customBtn) customBtn.disabled = true;
    
    saveData();
    updateUI();
    showNotification('Piedilista pulita', 'success');
}

function newProject() {
    if (!confirm('Tornare alla selezione progetti? I dati non salvati verranno persi.')) return;
    
    switchToProjectScreen();
}

function exportData() {
    const data = {
        timestamp: new Date().toISOString(),
        totalArea: app.totalArea,
        sampleTrees: app.sampleTrees,
        inventoryTrees: app.inventoryTrees,
        heightAverages: app.heightAverages,
        statistics: {
            totalTrees: app.inventoryTrees.length,
            treesPerHa: app.totalArea > 0 ? Math.round(app.inventoryTrees.length / app.totalArea) : 0,
            totalVolume: getTotalVolume(),
            volumePerHa: app.totalArea > 0 ? getTotalVolume() / app.totalArea : 0,
            basalArea: getTotalBasalArea()
        }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forestapp-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showNotification('Dati esportati', 'success');
}

function clearAll() {
    if (!confirm('ATTENZIONE: Questa operazione eliminerà TUTTI i dati.\nSei sicuro di voler continuare?')) return;
    
    localStorage.removeItem('forestapp-data');
    newProject();
    showNotification('Tutti i dati eliminati', 'success');
}

// Data persistence
function saveData() {
    // Save current project data to projects array
    saveProjects();
}

function loadData() {
    // Data is now loaded through projects system
    // This function is kept for compatibility
}

// Notifications
function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.getElementById('notifications').appendChild(notification);
    
    // Show animation
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Hide after delay
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, type === 'error' ? 5000 : 3000);
}

// Project Management Functions
function setupProjectEventListeners() {
    // New project button
    document.getElementById('new-project-btn').addEventListener('click', showNewProjectForm);
    
    // Create project button
    document.getElementById('create-project-btn').addEventListener('click', createNewProject);
    
    // Cancel project button
    document.getElementById('cancel-project-btn').addEventListener('click', hideNewProjectForm);
    
    // Species input in project form
    document.getElementById('add-species-to-project-btn').addEventListener('click', addSpeciesToProject);
    document.getElementById('new-species-name').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addSpeciesToProject();
    });
    
    // Emoji selectors
    setupEmojiSelector('emoji-btn', 'emoji-dropdown');
    setupEmojiSelector('modal-emoji-btn', 'modal-emoji-dropdown');
    setupEmojiSelector('modify-emoji-btn', 'modify-emoji-dropdown');
    
    // Species modal
    document.getElementById('save-species-btn').addEventListener('click', saveNewSpecies);
    document.getElementById('cancel-species-btn').addEventListener('click', hideSpeciesModal);
    
    // Species management modals
    document.getElementById('cancel-management-btn').addEventListener('click', hideSpeciesManagementModal);
    document.getElementById('save-modify-species-btn').addEventListener('click', saveModifiedSpecies);
    document.getElementById('cancel-modify-species-btn').addEventListener('click', hideModifySpeciesModal);
    
    // Custom diameter modal
    document.getElementById('save-custom-diameter-btn').addEventListener('click', saveCustomDiameter);
    document.getElementById('cancel-custom-diameter-btn').addEventListener('click', hideCustomDiameterModal);
    
    // Initialize emoji dropdowns
    initializeEmojiDropdowns();
}

function showNewProjectForm() {
    document.getElementById('new-project-form').style.display = 'block';
    document.getElementById('project-name-input').focus();
}

function hideNewProjectForm() {
    document.getElementById('new-project-form').style.display = 'none';
    document.getElementById('project-name-input').value = '';
    document.getElementById('project-area-input').value = '30';
    document.getElementById('new-species-name').value = '';
    document.getElementById('new-species-factor').value = '0.5';
    document.getElementById('new-species-height').value = '15';
    document.getElementById('emoji-btn').textContent = '🌲';
    projectSpeciesList = [];
    updateProjectSpeciesList();
}

function createNewProject() {
    const nameInput = document.getElementById('project-name-input');
    const areaInput = document.getElementById('project-area-input');
    
    const name = nameInput.value.trim();
    const area = parseFloat(areaInput.value);
    
    if (!name) {
        showNotification('Inserisci un nome per il progetto', 'error');
        nameInput.focus();
        return;
    }
    
    if (!area || area <= 0) {
        showNotification('Inserisci un\'area valida', 'error');
        areaInput.focus();
        return;
    }
    
    if (projectSpeciesList.length === 0) {
        showNotification('Aggiungi almeno una specie al progetto', 'error');
        document.getElementById('new-species-name').focus();
        return;
    }
    
    // Convert species list to species object
    const selectedSpecies = {};
    projectSpeciesList.forEach(species => {
        selectedSpecies[species.id] = {
            name: species.name,
            icon: species.icon,
            formFactor: species.formFactor,
            defaultHeight: species.defaultHeight
        };
    });
    
    const project = {
        id: Date.now(),
        name: name,
        area: area,
        created: new Date(),
        lastModified: new Date(),
        species: selectedSpecies,
        sampleTrees: [],
        inventoryTrees: [],
        heightAverages: {}
    };
    
    app.projects.push(project);
    app.currentProject = project;
    
    // Initialize app with project data
    app.totalArea = area;
    app.sampleTrees = [];
    app.inventoryTrees = [];
    app.heightAverages = {};
    app.selectedSpeciesSample = null;
    app.selectedSpeciesInventory = null;
    app.currentSampleTree = null;
    SPECIES = { ...selectedSpecies };
    
    saveProjects();
    switchToMainApp();
    
    showNotification(`Progetto \"${name}\" creato!`, 'success');
}

function loadProject(projectId) {
    const project = app.projects.find(p => p.id === projectId);
    if (!project) {
        showNotification('Progetto non trovato', 'error');
        return;
    }
    
    app.currentProject = project;
    app.totalArea = project.area;
    app.sampleTrees = project.sampleTrees || [];
    app.inventoryTrees = project.inventoryTrees || [];
    app.heightAverages = project.heightAverages || {};
    app.selectedSpeciesSample = null;
    app.selectedSpeciesInventory = null;
    app.currentSampleTree = null;
    
    // Load project species
    SPECIES = project.species || {};
    
    // Update last modified
    project.lastModified = new Date();
    saveProjects();
    
    switchToMainApp();
    
    showNotification(`Progetto "${project.name}" caricato!`, 'success');
}

function deleteProject(projectId) {
    const project = app.projects.find(p => p.id === projectId);
    if (!project) return;
    
    if (!confirm(`Eliminare il progetto "${project.name}"?\\nQuesta operazione è irreversibile.`)) return;
    
    app.projects = app.projects.filter(p => p.id !== projectId);
    saveProjects();
    updateProjectsUI();
    
    showNotification(`Progetto "${project.name}" eliminato`, 'success');
}

function switchToMainApp() {
    document.getElementById('project-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    
    generateSpeciesButtons();
    setupEventListeners();
    updateProjectNameInHeader();
    updateUI();
}

function switchToProjectScreen() {
    document.getElementById('app').style.display = 'none';
    document.getElementById('project-screen').style.display = 'block';
    updateProjectsUI();
}

function updateProjectNameInHeader() {
    if (app.currentProject) {
        document.getElementById('project-name').textContent = app.currentProject.name;
    }
}

function updateProjectsUI() {
    const container = document.getElementById('projects-list');
    
    if (app.projects.length === 0) {
        container.innerHTML = '<p class="empty">Nessun progetto salvato</p>';
        return;
    }
    
    const sortedProjects = [...app.projects].sort((a, b) => 
        new Date(b.lastModified) - new Date(a.lastModified)
    );
    
    container.innerHTML = sortedProjects.map(project => {
        const lastModified = new Date(project.lastModified).toLocaleDateString('it-IT');
        const totalTrees = (project.sampleTrees?.length || 0) + (project.inventoryTrees?.length || 0);
        
        return `
            <div class="project-item" onclick="loadProject(${project.id})">
                <div class="project-info">
                    <div class="project-name">${project.name}</div>
                    <div class="project-details">
                        Area: ${project.area} ha • ${totalTrees} piante • Modificato: ${lastModified}
                    </div>
                </div>
                <div class="project-actions-item">
                    <button class="btn-sm btn-danger-sm" onclick="event.stopPropagation(); deleteProject(${project.id})">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function saveProjects() {
    localStorage.setItem('forestapp-projects', JSON.stringify(app.projects));
    
    // Update current project data if active
    if (app.currentProject) {
        const project = app.projects.find(p => p.id === app.currentProject.id);
        if (project) {
            project.sampleTrees = app.sampleTrees;
            project.inventoryTrees = app.inventoryTrees;
            project.heightAverages = app.heightAverages;
            project.species = SPECIES;
            project.lastModified = new Date();
            localStorage.setItem('forestapp-projects', JSON.stringify(app.projects));
        }
    }
}

function loadProjects() {
    try {
        const saved = localStorage.getItem('forestapp-projects');
        if (saved) {
            app.projects = JSON.parse(saved);
        }
    } catch (error) {
        console.error('Error loading projects:', error);
        showNotification('Errore nel caricamento progetti', 'warning');
        app.projects = [];
    }
}

// Emoji and Species Management Functions
function initializeEmojiDropdowns() {
    populateEmojiDropdown('emoji-dropdown');
    populateEmojiDropdown('modal-emoji-dropdown');
    populateEmojiDropdown('modify-emoji-dropdown');
}

function populateEmojiDropdown(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    dropdown.innerHTML = '';
    
    Object.entries(EMOJI_OPTIONS).forEach(([category, emojis]) => {
        const categoryLabel = document.createElement('div');
        categoryLabel.className = 'emoji-category';
        categoryLabel.textContent = getCategoryName(category);
        dropdown.appendChild(categoryLabel);
        
        emojis.forEach(emoji => {
            const button = document.createElement('button');
            button.className = 'emoji-option';
            button.textContent = emoji;
            button.addEventListener('click', () => selectEmoji(dropdownId, emoji));
            dropdown.appendChild(button);
        });
    });
}

function getCategoryName(category) {
    const names = {
        'conifers': 'Conifere',
        'deciduous': 'Latifoglie', 
        'colored': 'Colori',
        'special': 'Speciali'
    };
    return names[category] || category;
}

function setupEmojiSelector(btnId, dropdownId) {
    const btn = document.getElementById(btnId);
    const dropdown = document.getElementById(dropdownId);
    
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        dropdown.style.display = dropdown.style.display === 'none' ? 'grid' : 'none';
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });
}

function selectEmoji(dropdownId, emoji) {
    const btnId = dropdownId.replace('-dropdown', '-btn');
    const btn = document.getElementById(btnId);
    btn.textContent = emoji;
    document.getElementById(dropdownId).style.display = 'none';
}

function addSpeciesToProject() {
    const nameInput = document.getElementById('new-species-name');
    const factorInput = document.getElementById('new-species-factor');
    const heightInput = document.getElementById('new-species-height');
    const iconBtn = document.getElementById('emoji-btn');
    
    const name = nameInput.value.trim();
    const formFactor = parseFloat(factorInput.value);
    const defaultHeight = parseFloat(heightInput.value);
    const icon = iconBtn.textContent;
    
    if (!name) {
        showNotification('Inserisci il nome della specie', 'error');
        nameInput.focus();
        return;
    }
    
    if (!formFactor || formFactor <= 0 || formFactor > 1) {
        showNotification('Inserisci un fattore di forma valido (0.1 - 1.0)', 'error');
        factorInput.focus();
        return;
    }
    
    if (!defaultHeight || defaultHeight <= 0 || defaultHeight > 50) {
        showNotification('Inserisci un\'altezza valida (0.5 - 50m)', 'error');
        heightInput.focus();
        return;
    }
    
    const speciesId = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    // Check if species already exists
    if (projectSpeciesList.find(s => s.id === speciesId)) {
        showNotification('Una specie con questo nome esiste già', 'error');
        nameInput.focus();
        return;
    }
    
    const species = {
        id: speciesId,
        name: name,
        icon: icon,
        formFactor: formFactor,
        defaultHeight: defaultHeight
    };
    
    projectSpeciesList.push(species);
    updateProjectSpeciesList();
    
    // Clear inputs
    nameInput.value = '';
    factorInput.value = '0.5';
    heightInput.value = '15';
    iconBtn.textContent = '🌲';
    
    showNotification(`Specie "${name}" aggiunta`, 'success');
}

function updateProjectSpeciesList() {
    const container = document.getElementById('project-species-list');
    
    if (projectSpeciesList.length === 0) {
        container.innerHTML = '<p class="empty">Nessuna specie aggiunta. Inizia aggiungendo le prime specie.</p>';
        return;
    }
    
    container.innerHTML = projectSpeciesList.map(species => `
        <div class="species-item">
            <div class="species-item-info">
                <div class="species-item-name">${species.icon} ${species.name}</div>
                <div class="species-item-details">Fattore: ${species.formFactor} • Altezza: ${species.defaultHeight}m</div>
            </div>
            <button class="btn-sm btn-danger-sm" onclick="removeSpeciesFromProject('${species.id}')">
                🗑️
            </button>
        </div>
    `).join('');
}

function removeSpeciesFromProject(speciesId) {
    projectSpeciesList = projectSpeciesList.filter(s => s.id !== speciesId);
    updateProjectSpeciesList();
    showNotification('Specie rimossa', 'success');
}

// Legacy Species Management Functions (kept for compatibility)
function removeCustomSpecies(button) {
    button.closest('.species-checkbox').remove();
}

function showAddSpeciesModal(type) {
    app.addingSpeciesFor = type;
    document.getElementById('species-modal').style.display = 'flex';
    document.getElementById('modal-species-name').focus();
}

function hideSpeciesModal() {
    document.getElementById('species-modal').style.display = 'none';
    document.getElementById('modal-species-name').value = '';
    document.getElementById('modal-emoji-btn').textContent = '🌲';
    document.getElementById('modal-species-factor').value = '0.5';
    document.getElementById('modal-species-height').value = '15';
    app.addingSpeciesFor = null;
}

function saveNewSpecies() {
    const nameInput = document.getElementById('modal-species-name');
    const iconBtn = document.getElementById('modal-emoji-btn');
    const factorInput = document.getElementById('modal-species-factor');
    const heightInput = document.getElementById('modal-species-height');
    
    const name = nameInput.value.trim();
    const icon = iconBtn.textContent;
    const formFactor = parseFloat(factorInput.value);
    const defaultHeight = parseFloat(heightInput.value);
    
    if (!name) {
        showNotification('Inserisci un nome per la specie', 'error');
        nameInput.focus();
        return;
    }
    
    if (!formFactor || formFactor <= 0 || formFactor > 1) {
        showNotification('Inserisci un fattore di forma valido (0.1 - 1.0)', 'error');
        factorInput.focus();
        return;
    }
    
    if (!defaultHeight || defaultHeight <= 0 || defaultHeight > 50) {
        showNotification('Inserisci un\'altezza valida (0.5 - 50m)', 'error');
        heightInput.focus();
        return;
    }
    
    const speciesId = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    // Check if species already exists
    if (SPECIES[speciesId]) {
        showNotification('Una specie con questo nome esiste già', 'error');
        nameInput.focus();
        return;
    }
    
    // Add to current project species
    const newSpecies = {
        name: name,
        icon: icon,
        formFactor: formFactor,
        defaultHeight: defaultHeight
    };
    
    SPECIES[speciesId] = newSpecies;
    
    // Update project data
    if (app.currentProject) {
        app.currentProject.species = app.currentProject.species || {};
        app.currentProject.species[speciesId] = newSpecies;
        saveProjects();
    }
    
    // Refresh species buttons
    generateSpeciesButtons();
    
    hideSpeciesModal();
    showNotification(`Specie "${name}" aggiunta al progetto`, 'success');
}

function generateSpeciesButtons() {
    if (!app.currentProject || !app.currentProject.species) return;
    
    // Generate sample species buttons
    const sampleContainer = document.getElementById('sample-species-buttons');
    sampleContainer.innerHTML = '';
    
    Object.entries(app.currentProject.species).forEach(([id, species]) => {
        const button = document.createElement('button');
        button.className = 'species-btn';
        button.dataset.species = id;
        button.textContent = `${species.icon} ${species.name}`;
        sampleContainer.appendChild(button);
    });
    
    // Generate inventory species buttons
    const inventoryContainer = document.getElementById('inventory-species-buttons');
    inventoryContainer.innerHTML = '';
    
    Object.entries(app.currentProject.species).forEach(([id, species]) => {
        const button = document.createElement('button');
        button.className = 'species-btn';
        button.dataset.species = id;
        button.textContent = `${species.icon} ${species.name}`;
        inventoryContainer.appendChild(button);
    });
    
    // Reattach event listeners
    setupSpeciesEventListeners();
}

function setupSpeciesEventListeners() {
    // Species buttons - Sample
    document.querySelectorAll('#sample-species-buttons .species-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            selectSpecies('sample', btn.dataset.species);
        });
    });

    // Species buttons - Inventory
    document.querySelectorAll('#inventory-species-buttons .species-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            selectSpecies('inventory', btn.dataset.species);
        });
    });
}

// Species Management Functions
let currentModifyingSpecies = null;

function showSpeciesManagementModal(mode) {
    if (!app.currentProject || !SPECIES || Object.keys(SPECIES).length === 0) {
        showNotification('Nessuna specie disponibile nel progetto', 'info');
        return;
    }
    
    const modal = document.getElementById('species-management-modal');
    const title = document.getElementById('management-modal-title');
    
    if (mode === 'delete') {
        title.textContent = 'Elimina Specie';
    } else if (mode === 'modify') {
        title.textContent = 'Modifica Specie';
    }
    
    populateSpeciesManagementList(mode);
    modal.style.display = 'flex';
}

function populateSpeciesManagementList(mode) {
    const container = document.getElementById('species-list-container');
    
    if (!SPECIES || Object.keys(SPECIES).length === 0) {
        container.innerHTML = '<p class="empty">Nessuna specie disponibile nel progetto</p>';
        return;
    }
    
    container.innerHTML = Object.entries(SPECIES).map(([id, species]) => `
        <div class="species-management-item">
            <div class="species-management-info">
                <div class="species-management-name">${species.icon} ${species.name}</div>
                <div class="species-management-details">
                    ID: ${id} • Fattore: ${species.formFactor} • Altezza: ${species.defaultHeight || 'N/A'}m
                </div>
            </div>
            <div class="species-management-actions">
                ${mode === 'delete' ? `
                    <button class="species-action-btn delete" onclick="confirmDeleteSpecies('${id}')" title="Elimina specie">
                        🗑️
                    </button>
                ` : `
                    <button class="species-action-btn modify" onclick="startModifySpecies('${id}')" title="Modifica specie">
                        ✏️
                    </button>
                `}
            </div>
        </div>
    `).join('');
}

function hideSpeciesManagementModal() {
    document.getElementById('species-management-modal').style.display = 'none';
}

function confirmDeleteSpecies(speciesId) {
    const species = SPECIES[speciesId];
    if (!species) return;
    
    // Check if species is used in any trees
    const usedInSample = app.sampleTrees.some(tree => tree.species === speciesId);
    const usedInInventory = app.inventoryTrees.some(tree => tree.species === speciesId);
    
    let confirmMessage = `Eliminare la specie "${species.name}"?`;
    
    if (usedInSample || usedInInventory) {
        const sampleCount = app.sampleTrees.filter(tree => tree.species === speciesId).length;
        const inventoryCount = app.inventoryTrees.filter(tree => tree.species === speciesId).length;
        
        confirmMessage += `\\n\\nATTENZIONE: Questa specie è utilizzata in:`;
        if (sampleCount > 0) confirmMessage += `\\n- ${sampleCount} piante di saggio`;
        if (inventoryCount > 0) confirmMessage += `\\n- ${inventoryCount} piante di piedilista`;
        confirmMessage += `\\n\\nTutti i dati relativi a questa specie verranno eliminati!`;
    }
    
    if (!confirm(confirmMessage)) return;
    
    deleteSpeciesFromProject(speciesId);
}

function deleteSpeciesFromProject(speciesId) {
    const species = SPECIES[speciesId];
    if (!species) return;
    
    // Remove species from SPECIES object
    delete SPECIES[speciesId];
    
    // Remove all trees of this species from sampleTrees
    app.sampleTrees = app.sampleTrees.filter(tree => tree.species !== speciesId);
    
    // Remove all trees of this species from inventoryTrees
    app.inventoryTrees = app.inventoryTrees.filter(tree => tree.species !== speciesId);
    
    // Remove height averages for this species
    if (app.heightAverages[speciesId]) {
        delete app.heightAverages[speciesId];
    }
    
    // Clear current selections if they match deleted species
    if (app.selectedSpeciesSample === speciesId) {
        app.selectedSpeciesSample = null;
    }
    if (app.selectedSpeciesInventory === speciesId) {
        app.selectedSpeciesInventory = null;
    }
    
    // Update project data
    saveProjects();
    
    // Refresh UI
    generateSpeciesButtons();
    updateUI();
    
    // Close modal and show confirmation
    hideSpeciesManagementModal();
    showNotification(`Specie "${species.name}" eliminata dal progetto`, 'success');
}

function startModifySpecies(speciesId) {
    const species = SPECIES[speciesId];
    if (!species) return;
    
    currentModifyingSpecies = speciesId;
    
    // Populate modify modal with current data
    document.getElementById('modify-species-name').value = species.name;
    document.getElementById('modify-emoji-btn').textContent = species.icon;
    document.getElementById('modify-species-factor').value = species.formFactor;
    document.getElementById('modify-species-height').value = species.defaultHeight || 15;
    
    // Hide management modal and show modify modal
    hideSpeciesManagementModal();
    document.getElementById('modify-species-modal').style.display = 'flex';
    document.getElementById('modify-species-name').focus();
}

function hideModifySpeciesModal() {
    document.getElementById('modify-species-modal').style.display = 'none';
    document.getElementById('modify-species-name').value = '';
    document.getElementById('modify-emoji-btn').textContent = '🌲';
    document.getElementById('modify-species-factor').value = '0.5';
    document.getElementById('modify-species-height').value = '15';
    currentModifyingSpecies = null;
}

function saveModifiedSpecies() {
    if (!currentModifyingSpecies) return;
    
    const nameInput = document.getElementById('modify-species-name');
    const iconBtn = document.getElementById('modify-emoji-btn');
    const factorInput = document.getElementById('modify-species-factor');
    const heightInput = document.getElementById('modify-species-height');
    
    const newName = nameInput.value.trim();
    const newIcon = iconBtn.textContent;
    const newFormFactor = parseFloat(factorInput.value);
    const newDefaultHeight = parseFloat(heightInput.value);
    
    if (!newName) {
        showNotification('Inserisci un nome per la specie', 'error');
        nameInput.focus();
        return;
    }
    
    if (!newFormFactor || newFormFactor <= 0 || newFormFactor > 1) {
        showNotification('Inserisci un fattore di forma valido (0.1 - 1.0)', 'error');
        factorInput.focus();
        return;
    }
    
    if (!newDefaultHeight || newDefaultHeight <= 0 || newDefaultHeight > 50) {
        showNotification('Inserisci un\'altezza valida (0.5 - 50m)', 'error');
        heightInput.focus();
        return;
    }
    
    const newSpeciesId = newName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const oldSpecies = SPECIES[currentModifyingSpecies];
    
    // Check if new name creates a different ID and if it conflicts
    if (newSpeciesId !== currentModifyingSpecies && SPECIES[newSpeciesId]) {
        showNotification('Una specie con questo nome esiste già', 'error');
        nameInput.focus();
        return;
    }
    
    // Update species data
    const updatedSpecies = {
        name: newName,
        icon: newIcon,
        formFactor: newFormFactor,
        defaultHeight: newDefaultHeight
    };
    
    // If ID changed, we need to update all references
    if (newSpeciesId !== currentModifyingSpecies) {
        // Add new species
        SPECIES[newSpeciesId] = updatedSpecies;
        
        // Remove old species
        delete SPECIES[currentModifyingSpecies];
        
        // Update all tree references
        app.sampleTrees.forEach(tree => {
            if (tree.species === currentModifyingSpecies) {
                tree.species = newSpeciesId;
            }
        });
        
        app.inventoryTrees.forEach(tree => {
            if (tree.species === currentModifyingSpecies) {
                tree.species = newSpeciesId;
            }
        });
        
        // Update height averages
        if (app.heightAverages[currentModifyingSpecies]) {
            app.heightAverages[newSpeciesId] = app.heightAverages[currentModifyingSpecies];
            delete app.heightAverages[currentModifyingSpecies];
        }
        
        // Update current selections
        if (app.selectedSpeciesSample === currentModifyingSpecies) {
            app.selectedSpeciesSample = newSpeciesId;
        }
        if (app.selectedSpeciesInventory === currentModifyingSpecies) {
            app.selectedSpeciesInventory = newSpeciesId;
        }
    } else {
        // Just update the species data
        SPECIES[currentModifyingSpecies] = updatedSpecies;
    }
    
    // Save and refresh
    saveProjects();
    generateSpeciesButtons();
    updateUI();
    
    hideModifySpeciesModal();
    showNotification(`Specie aggiornata: "${newName}"`, 'success');
}

// Custom Diameter Functions
let currentDiameterType = null;

function showCustomDiameterModal(type) {
    currentDiameterType = type;
    document.getElementById('custom-diameter-modal').style.display = 'flex';
    document.getElementById('custom-diameter-input').focus();
}

function hideCustomDiameterModal() {
    document.getElementById('custom-diameter-modal').style.display = 'none';
    document.getElementById('custom-diameter-input').value = '';
    // Don't reset currentDiameterType immediately - it's needed for the callback
}

function saveCustomDiameter() {
    const input = document.getElementById('custom-diameter-input');
    const diameter = parseFloat(input.value);
    
    
    if (!diameter || diameter <= 0) {
        showNotification('Inserisci un diametro valido', 'error');
        input.focus();
        return;
    }
    
    if (diameter <= 60) {
        showNotification('Per diametri fino a 60cm usa i pulsanti standard', 'error');
        input.focus();
        return;
    }
    
    if (diameter > 200) {
        showNotification('Il diametro massimo consentito è 200cm', 'error');
        input.focus();
        return;
    }
    
    hideCustomDiameterModal();
    
    // Add a small delay to ensure modal is fully closed
    setTimeout(() => {
        if (currentDiameterType === 'sample') {
            selectDiameter('sample', diameter);
        } else if (currentDiameterType === 'inventory') {
            addInventoryTree(diameter);
        }
        // Reset the type after processing
        currentDiameterType = null;
    }, 100);
}

// Make functions global for onclick handlers
window.deleteSampleTree = deleteSampleTree;
window.deleteInventoryTree = deleteInventoryTree;
window.loadProject = loadProject;
window.deleteProject = deleteProject;
window.showAddSpeciesModal = showAddSpeciesModal;
window.removeCustomSpecies = removeCustomSpecies;
window.removeSpeciesFromProject = removeSpeciesFromProject;
window.showSpeciesManagementModal = showSpeciesManagementModal;
window.confirmDeleteSpecies = confirmDeleteSpecies;
window.startModifySpecies = startModifySpecies;
window.showCustomDiameterModal = showCustomDiameterModal;