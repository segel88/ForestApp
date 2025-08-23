// Simple Database Layer for ForestApp
// Uses localStorage for data persistence (can be easily upgraded to IndexedDB later)

class ForestDB {
    constructor() {
        this.dbName = 'forestapp';
        this.version = '1.0';
        this.init();
    }

    init() {
        console.log('🗄️ ForestDB initialized');
        
        // Initialize default structure if first time
        if (!localStorage.getItem(`${this.dbName}-initialized`)) {
            this.createInitialStructure();
        }
    }

    createInitialStructure() {
        const initialData = {
            projects: [],
            settings: {
                operator: 'Operatore',
                lastProjectId: null,
                theme: 'light'
            },
            metadata: {
                version: this.version,
                created: new Date().toISOString(),
                lastAccess: new Date().toISOString()
            }
        };

        localStorage.setItem(`${this.dbName}-data`, JSON.stringify(initialData));
        localStorage.setItem(`${this.dbName}-initialized`, 'true');
        
        console.log('✅ Database structure created');
    }

    // Get all data
    getData() {
        try {
            const data = localStorage.getItem(`${this.dbName}-data`);
            return data ? JSON.parse(data) : this.getDefaultData();
        } catch (error) {
            console.error('Error reading database:', error);
            return this.getDefaultData();
        }
    }

    // Save all data
    saveData(data) {
        try {
            data.metadata.lastAccess = new Date().toISOString();
            localStorage.setItem(`${this.dbName}-data`, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving database:', error);
            return false;
        }
    }

    getDefaultData() {
        return {
            projects: [],
            settings: {
                operator: 'Operatore',
                lastProjectId: null,
                theme: 'light'
            },
            metadata: {
                version: this.version,
                created: new Date().toISOString(),
                lastAccess: new Date().toISOString()
            }
        };
    }

    // Project operations
    createProject(projectData) {
        const data = this.getData();
        
        const project = {
            id: Date.now(),
            name: projectData.name || 'Nuovo Progetto',
            description: projectData.description || '',
            operator: projectData.operator || 'Operatore',
            location: projectData.location || '',
            totalArea: projectData.totalArea || 30,
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            sampleTrees: [],
            inventoryTrees: [],
            heightAverages: {},
            settings: {
                currentArea: 1,
                selectedSpeciesSample: null,
                selectedSpeciesInventory: null
            }
        };

        data.projects.push(project);
        data.settings.lastProjectId = project.id;
        
        if (this.saveData(data)) {
            console.log('✅ Project created:', project.name);
            return project;
        }
        
        throw new Error('Failed to create project');
    }

    getProject(projectId) {
        const data = this.getData();
        return data.projects.find(p => p.id === projectId);
    }

    getAllProjects() {
        const data = this.getData();
        return data.projects;
    }

    updateProject(projectId, updates) {
        const data = this.getData();
        const projectIndex = data.projects.findIndex(p => p.id === projectId);
        
        if (projectIndex === -1) {
            throw new Error('Project not found');
        }

        data.projects[projectIndex] = {
            ...data.projects[projectIndex],
            ...updates,
            modified: new Date().toISOString()
        };

        if (this.saveData(data)) {
            return data.projects[projectIndex];
        }
        
        throw new Error('Failed to update project');
    }

    deleteProject(projectId) {
        const data = this.getData();
        const projectIndex = data.projects.findIndex(p => p.id === projectId);
        
        if (projectIndex === -1) {
            throw new Error('Project not found');
        }

        const projectName = data.projects[projectIndex].name;
        data.projects.splice(projectIndex, 1);
        
        // Update last project if it was deleted
        if (data.settings.lastProjectId === projectId) {
            data.settings.lastProjectId = data.projects.length > 0 ? data.projects[0].id : null;
        }

        if (this.saveData(data)) {
            console.log('✅ Project deleted:', projectName);
            return true;
        }
        
        throw new Error('Failed to delete project');
    }

    // Sample trees operations
    addSampleTree(projectId, treeData) {
        const data = this.getData();
        const project = data.projects.find(p => p.id === projectId);
        
        if (!project) {
            throw new Error('Project not found');
        }

        const tree = {
            id: Date.now() + Math.random(),
            ...treeData,
            timestamp: new Date().toISOString()
        };

        project.sampleTrees.push(tree);
        project.modified = new Date().toISOString();

        if (this.saveData(data)) {
            console.log('✅ Sample tree added');
            return tree;
        }
        
        throw new Error('Failed to add sample tree');
    }

    deleteSampleTree(projectId, treeId) {
        const data = this.getData();
        const project = data.projects.find(p => p.id === projectId);
        
        if (!project) {
            throw new Error('Project not found');
        }

        const treeIndex = project.sampleTrees.findIndex(t => t.id == treeId);
        if (treeIndex === -1) {
            throw new Error('Tree not found');
        }

        project.sampleTrees.splice(treeIndex, 1);
        project.modified = new Date().toISOString();

        if (this.saveData(data)) {
            console.log('✅ Sample tree deleted');
            return true;
        }
        
        throw new Error('Failed to delete sample tree');
    }

    // Inventory trees operations
    addInventoryTree(projectId, treeData) {
        const data = this.getData();
        const project = data.projects.find(p => p.id === projectId);
        
        if (!project) {
            throw new Error('Project not found');
        }

        const tree = {
            id: Date.now() + Math.random(),
            ...treeData,
            timestamp: new Date().toISOString()
        };

        project.inventoryTrees.push(tree);
        project.modified = new Date().toISOString();

        if (this.saveData(data)) {
            console.log('✅ Inventory tree added');
            return tree;
        }
        
        throw new Error('Failed to add inventory tree');
    }

    deleteInventoryTree(projectId, treeId) {
        const data = this.getData();
        const project = data.projects.find(p => p.id === projectId);
        
        if (!project) {
            throw new Error('Project not found');
        }

        const treeIndex = project.inventoryTrees.findIndex(t => t.id == treeId);
        if (treeIndex === -1) {
            throw new Error('Tree not found');
        }

        project.inventoryTrees.splice(treeIndex, 1);
        project.modified = new Date().toISOString();

        if (this.saveData(data)) {
            console.log('✅ Inventory tree deleted');
            return true;
        }
        
        throw new Error('Failed to delete inventory tree');
    }

    clearInventory(projectId) {
        const data = this.getData();
        const project = data.projects.find(p => p.id === projectId);
        
        if (!project) {
            throw new Error('Project not found');
        }

        project.inventoryTrees = [];
        project.modified = new Date().toISOString();

        if (this.saveData(data)) {
            console.log('✅ Inventory cleared');
            return true;
        }
        
        throw new Error('Failed to clear inventory');
    }

    // Height averages operations
    updateHeightAverages(projectId, averages) {
        const data = this.getData();
        const project = data.projects.find(p => p.id === projectId);
        
        if (!project) {
            throw new Error('Project not found');
        }

        project.heightAverages = averages;
        project.modified = new Date().toISOString();

        if (this.saveData(data)) {
            console.log('✅ Height averages updated');
            return true;
        }
        
        throw new Error('Failed to update height averages');
    }

    // Settings operations
    getSetting(key) {
        const data = this.getData();
        return data.settings[key];
    }

    setSetting(key, value) {
        const data = this.getData();
        data.settings[key] = value;
        
        if (this.saveData(data)) {
            console.log(`✅ Setting updated: ${key} = ${value}`);
            return true;
        }
        
        throw new Error('Failed to update setting');
    }

    // Export/Import operations
    exportProject(projectId) {
        const project = this.getProject(projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        return {
            formatVersion: '1.0',
            exportDate: new Date().toISOString(),
            project: project
        };
    }

    importProject(projectData) {
        const data = this.getData();
        
        // Create new project with imported data
        const project = {
            ...projectData.project,
            id: Date.now(), // New ID
            imported: new Date().toISOString(),
            modified: new Date().toISOString()
        };

        data.projects.push(project);
        
        if (this.saveData(data)) {
            console.log('✅ Project imported:', project.name);
            return project;
        }
        
        throw new Error('Failed to import project');
    }

    // Backup operations
    createBackup() {
        const data = this.getData();
        return {
            backup: true,
            version: this.version,
            timestamp: new Date().toISOString(),
            data: data
        };
    }

    restoreBackup(backupData) {
        if (!backupData.backup || !backupData.data) {
            throw new Error('Invalid backup data');
        }

        if (this.saveData(backupData.data)) {
            console.log('✅ Backup restored');
            return true;
        }
        
        throw new Error('Failed to restore backup');
    }

    // Statistics
    getStats() {
        const data = this.getData();
        
        let totalProjects = data.projects.length;
        let totalSampleTrees = 0;
        let totalInventoryTrees = 0;
        let totalArea = 0;

        data.projects.forEach(project => {
            totalSampleTrees += project.sampleTrees.length;
            totalInventoryTrees += project.inventoryTrees.length;
            totalArea += project.totalArea;
        });

        return {
            totalProjects,
            totalSampleTrees,
            totalInventoryTrees,
            totalArea,
            lastAccess: data.metadata.lastAccess,
            databaseSize: this.getDatabaseSize()
        };
    }

    getDatabaseSize() {
        try {
            const data = localStorage.getItem(`${this.dbName}-data`);
            return data ? (data.length / 1024).toFixed(2) + ' KB' : '0 KB';
        } catch (error) {
            return 'Unknown';
        }
    }

    // Maintenance
    cleanup() {
        // Remove old projects (older than 1 year) if there are too many
        const data = this.getData();
        
        if (data.projects.length > 50) {
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            
            const activeProjects = data.projects.filter(project => 
                new Date(project.modified) > oneYearAgo
            );
            
            if (activeProjects.length < data.projects.length) {
                data.projects = activeProjects;
                this.saveData(data);
                console.log('✅ Database cleanup completed');
                return true;
            }
        }
        
        return false;
    }

    // Clear all data
    clearAll() {
        localStorage.removeItem(`${this.dbName}-data`);
        localStorage.removeItem(`${this.dbName}-initialized`);
        this.createInitialStructure();
        console.log('✅ All data cleared');
        return true;
    }
}

// Global instance
window.forestDB = new ForestDB();
console.log('✅ ForestDB ready');