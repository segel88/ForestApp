/* ForestApp PWA - Project Management System */
console.log('📁 Loading projectManager.js...');

class ProjectManager {
    constructor(database) {
        this.db = database;
        this.currentProject = null;
        this.projects = [];
    }

    // Initialize project manager
    async init() {
        await this.loadProjects();
        
        // Check for current project setting
        const currentProjectId = await this.db.getSetting('currentProject');
        if (currentProjectId) {
            await this.setCurrentProject(currentProjectId);
        } else {
            // Create default project if none exist
            if (this.projects.length === 0) {
                await this.createDefaultProject();
            } else {
                // Set first project as current
                await this.setCurrentProject(this.projects[0].id);
            }
        }

        console.log('📂 Project Manager initialized');
    }

    // Load all projects
    async loadProjects() {
        this.projects = await this.db.getProjects();
        this.projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }

    // Create default project
    async createDefaultProject() {
        const defaultProject = {
            name: 'Progetto di Default',
            description: 'Primo progetto ForestApp',
            operator: appState?.operatorName || 'Operatore',
            inventoryAreaHa: 30.0,
            location: ''
        };

        const projectId = await this.createProject(defaultProject);
        await this.setCurrentProject(projectId);
        return projectId;
    }

    // Create new project
    async createProject(projectData) {
        try {
            const projectId = await this.db.createProject(projectData);
            await this.loadProjects();
            
            showNotification(`✅ Progetto "${projectData.name}" creato con successo!`, 'success');
            return projectId;
        } catch (error) {
            console.error('❌ Error creating project:', error);
            showNotification('❌ Errore nella creazione del progetto', 'error');
            throw error;
        }
    }

    // Set current active project
    async setCurrentProject(projectId) {
        try {
            this.currentProject = await this.db.getProject(projectId);
            if (!this.currentProject) {
                throw new Error('Project not found');
            }

            // Save current project setting
            await this.db.setSetting('currentProject', projectId);
            
            // Update app state
            if (window.appState) {
                appState.currentProjectId = projectId;
                appState.inventoryAreaHa = this.currentProject.inventoryAreaHa;
                appState.operatorName = this.currentProject.operator;
            }

            // Load project data into app state
            await this.loadProjectData();
            
            console.log('📁 Current project set:', this.currentProject.name);
            return this.currentProject;
        } catch (error) {
            console.error('❌ Error setting current project:', error);
            throw error;
        }
    }

    // Load current project data into app state
    async loadProjectData() {
        if (!this.currentProject) return;

        try {
            // Load sample trees by area
            const allSampleTrees = await this.db.getSampleTrees(this.currentProject.id);
            
            // Organize by area
            const sampleAreas = {
                area1: { completeTrees: [] },
                area2: { completeTrees: [] },
                area3: { completeTrees: [] },
                area4: { completeTrees: [] },
                area5: { completeTrees: [] }
            };

            allSampleTrees.forEach(tree => {
                if (sampleAreas[tree.area]) {
                    sampleAreas[tree.area].completeTrees.push(tree);
                }
            });

            // Load inventory trees
            const inventoryTrees = await this.db.getInventoryTrees(this.currentProject.id);

            // Load height averages
            const heightAverages = await this.db.getHeightAverages(this.currentProject.id);

            // Update app state
            if (window.appState) {
                appState.sampleAreas = sampleAreas;
                appState.inventoryTrees = inventoryTrees;
                appState.speciesHeightAverages = heightAverages;
                appState.inventoryAreaHa = this.currentProject.inventoryAreaHa;
                appState.operatorName = this.currentProject.operator;
            }

            console.log('📊 Project data loaded successfully');
        } catch (error) {
            console.error('❌ Error loading project data:', error);
            showNotification('❌ Errore nel caricamento dati progetto', 'error');
        }
    }

    // Update project
    async updateProject(projectId, updates) {
        try {
            await this.db.updateProject(projectId, updates);
            await this.loadProjects();
            
            // If updating current project, reload it
            if (this.currentProject && this.currentProject.id === projectId) {
                await this.setCurrentProject(projectId);
            }

            showNotification('✅ Progetto aggiornato con successo!', 'success');
        } catch (error) {
            console.error('❌ Error updating project:', error);
            showNotification('❌ Errore nell\'aggiornamento del progetto', 'error');
            throw error;
        }
    }

    // Delete project
    async deleteProject(projectId) {
        try {
            if (this.projects.length <= 1) {
                showNotification('❌ Non puoi eliminare l\'ultimo progetto', 'error');
                return false;
            }

            // Check if deleting current project
            const deletingCurrent = this.currentProject && this.currentProject.id === projectId;

            await this.db.deleteProject(projectId);
            await this.loadProjects();

            // If deleted current project, set another as current
            if (deletingCurrent && this.projects.length > 0) {
                await this.setCurrentProject(this.projects[0].id);
            }

            showNotification('✅ Progetto eliminato con successo!', 'success');
            return true;
        } catch (error) {
            console.error('❌ Error deleting project:', error);
            showNotification('❌ Errore nell\'eliminazione del progetto', 'error');
            throw error;
        }
    }

    // Get project statistics
    async getProjectStats(projectId) {
        try {
            const sampleTrees = await this.db.getSampleTrees(projectId);
            const inventoryTrees = await this.db.getInventoryTrees(projectId);
            const heightAverages = await this.db.getHeightAverages(projectId);

            // Calculate volume and other stats
            let totalVolume = 0;
            let totalBasalArea = 0;

            inventoryTrees.forEach(tree => {
                const basalArea = calculateTreeBasalArea(tree.diameterClass);
                totalBasalArea += basalArea;

                if (heightAverages[tree.species]) {
                    const avgHeight = heightAverages[tree.species].average;
                    const formFactor = SPECIES_CONFIG[tree.species]?.formFactor || 0.45;
                    totalVolume += basalArea * avgHeight * formFactor;
                }
            });

            const project = await this.db.getProject(projectId);
            const area = project?.inventoryAreaHa || 1;

            return {
                projectId,
                sampleTrees: sampleTrees.length,
                inventoryTrees: inventoryTrees.length,
                speciesWithHeights: Object.keys(heightAverages).length,
                totalVolume,
                totalBasalArea,
                volumePerHa: totalVolume / area,
                basalAreaPerHa: totalBasalArea / area,
                treesPerHa: Math.round(inventoryTrees.length / area)
            };
        } catch (error) {
            console.error('❌ Error calculating project stats:', error);
            return null;
        }
    }

    // Export project data
    async exportProject(projectId, format = 'json') {
        try {
            const projectData = await this.db.exportProject(projectId);
            const project = await this.db.getProject(projectId);
            
            const fileName = `${project.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}`;

            if (format === 'json') {
                this.downloadJSON(projectData, `${fileName}.json`);
            } else if (format === 'csv') {
                const csvData = this.convertToCSV(projectData);
                this.downloadCSV(csvData, `${fileName}.csv`);
            }

            showNotification(`📄 Progetto esportato come ${format.toUpperCase()}`, 'success');
        } catch (error) {
            console.error('❌ Error exporting project:', error);
            showNotification('❌ Errore nell\'esportazione', 'error');
        }
    }

    // Import project data
    async importProject(file) {
        try {
            const fileContent = await this.readFile(file);
            let projectData;

            if (file.name.endsWith('.json')) {
                projectData = JSON.parse(fileContent);
            } else {
                throw new Error('Formato file non supportato. Usa file JSON.');
            }

            // Validate project data structure
            if (!projectData.project || !projectData.sampleTrees || !projectData.inventoryTrees) {
                throw new Error('Struttura file non valida');
            }

            const newProjectId = await this.db.importProject(projectData);
            await this.loadProjects();
            
            showNotification('✅ Progetto importato con successo!', 'success');
            return newProjectId;
        } catch (error) {
            console.error('❌ Error importing project:', error);
            showNotification(`❌ Errore nell'importazione: ${error.message}`, 'error');
            throw error;
        }
    }

    // Duplicate project
    async duplicateProject(projectId) {
        try {
            const projectData = await this.db.exportProject(projectId);
            const originalProject = projectData.project;
            
            // Modify project name
            projectData.project = {
                ...originalProject,
                name: `${originalProject.name} (Copia)`,
                description: `Copia di: ${originalProject.description}`
            };

            // Reset sync status
            projectData.sampleTrees.forEach(tree => tree.synced = false);
            projectData.inventoryTrees.forEach(tree => tree.synced = false);

            const newProjectId = await this.db.importProject(projectData);
            await this.loadProjects();
            
            showNotification('✅ Progetto duplicato con successo!', 'success');
            return newProjectId;
        } catch (error) {
            console.error('❌ Error duplicating project:', error);
            showNotification('❌ Errore nella duplicazione del progetto', 'error');
            throw error;
        }
    }

    // Save current session data to database
    async saveCurrentSession() {
        if (!this.currentProject || !window.appState) return;

        try {
            // Update project info
            await this.updateProject(this.currentProject.id, {
                inventoryAreaHa: appState.inventoryAreaHa,
                operator: appState.operatorName
            });

            // Save height averages
            if (Object.keys(appState.speciesHeightAverages).length > 0) {
                await this.db.saveHeightAverages(this.currentProject.id, appState.speciesHeightAverages);
            }

            console.log('💾 Session data saved to database');
        } catch (error) {
            console.error('❌ Error saving session:', error);
        }
    }

    // Helper methods
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }

    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        this.downloadBlob(blob, filename);
    }

    downloadCSV(csvData, filename) {
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        this.downloadBlob(blob, filename);
    }

    downloadBlob(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    convertToCSV(projectData) {
        const csvSections = [];
        
        // Project info
        csvSections.push('INFORMAZIONI_PROGETTO');
        csvSections.push('Nome,Descrizione,Operatore,Area_ha,Creato_il');
        const p = projectData.project;
        csvSections.push(`"${p.name}","${p.description}","${p.operator}",${p.inventoryAreaHa},"${p.createdAt}"`);
        csvSections.push('');

        // Sample trees
        if (projectData.sampleTrees.length > 0) {
            csvSections.push('AREE_DI_SAGGIO');
            csvSections.push('Area,Specie,Classe_Diam,Altezza_m,GPS_Lat,GPS_Lng,Timestamp,Operatore');
            projectData.sampleTrees.forEach(tree => {
                const speciesName = SPECIES_CONFIG[tree.species]?.name || tree.species;
                csvSections.push([
                    tree.area,
                    `"${speciesName}"`,
                    tree.diameterClass,
                    tree.height,
                    tree.gps ? tree.gps.lat.toFixed(6) : '',
                    tree.gps ? tree.gps.lng.toFixed(6) : '',
                    tree.timestamp,
                    `"${tree.operator}"`
                ].join(','));
            });
            csvSections.push('');
        }

        // Inventory trees
        if (projectData.inventoryTrees.length > 0) {
            csvSections.push('PIEDILISTA');
            csvSections.push('Specie,Classe_Diam,GPS_Lat,GPS_Lng,Timestamp,Operatore');
            projectData.inventoryTrees.forEach(tree => {
                const speciesName = SPECIES_CONFIG[tree.species]?.name || tree.species;
                csvSections.push([
                    `"${speciesName}"`,
                    tree.diameterClass,
                    tree.gps ? tree.gps.lat.toFixed(6) : '',
                    tree.gps ? tree.gps.lng.toFixed(6) : '',
                    tree.timestamp,
                    `"${tree.operator}"`
                ].join(','));
            });
            csvSections.push('');
        }

        return csvSections.join('\n');
    }

    // Get formatted project list for UI
    getProjectsForUI() {
        return this.projects.map(project => ({
            ...project,
            isActive: this.currentProject && project.id === this.currentProject.id,
            formattedDate: new Date(project.createdAt).toLocaleDateString('it-IT'),
            formattedUpdate: new Date(project.updatedAt).toLocaleDateString('it-IT')
        }));
    }
}

// Global project manager instance will be defined in app.js

// Initialize project manager
async function initializeProjectManager(database) {
    const pm = new ProjectManager(database);
    await pm.init();
    return pm;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ProjectManager, initializeProjectManager };
}

console.log('📂 Project Manager loaded successfully!');