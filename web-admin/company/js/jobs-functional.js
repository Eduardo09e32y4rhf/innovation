const API_URL = ''; // Usando caminhos relativos para funcionar em qualquer host

let currentJobs = [];
let currentApplications = [];

// CARREGAR VAGAS
async function loadJobs() {
    showLoading();
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/jobs`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Erro ao carregar');
        
        currentJobs = await response.json();
        renderJobs();
        hideLoading();
        
    } catch (error) {
        hideLoading();
        showNotification('Erro ao carregar vagas', 'error');
        console.error(error);
    }
}

// RENDERIZAR VAGAS
function renderJobs() {
    const container = document.getElementById('jobsList');
    if (!container) return;

    if (currentJobs.length === 0) {
        container.innerHTML = `
            <div class="text-center py-16">
                <div class="text-6xl mb-4">📋</div>
                <h3 class="text-2xl font-bold text-gray-900 mb-2">Nenhuma vaga ainda</h3>
                <p class="text-gray-600 mb-6">Comece criando sua primeira vaga</p>
                <button onclick="showCreateModal()" class="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">
                    + Criar Primeira Vaga
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = currentJobs.map(job => `
        <div class="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all duration-300 mb-6">
            <div class="flex justify-between items-start mb-4">
                <div class="flex-1">
                    <h3 class="text-2xl font-bold text-gray-900 mb-2">${job.title}</h3>
                    <div class="flex items-center gap-4 text-gray-600 mb-3">
                        <span class="flex items-center gap-1">
                            📍 ${job.location}
                        </span>
                        <span class="flex items-center gap-1">
                            💼 ${job.type || 'Não especificado'}
                        </span>
                        <span class="flex items-center gap-1">
                            👥 ${job.applications_count || 0} candidatos
                        </span>
                    </div>
                </div>
                <div class="flex flex-col items-end gap-2">
                    <span class="px-4 py-1 ${getStatusBadgeClass(job.status)} rounded-full text-sm font-semibold">
                        ${getStatusLabel(job.status)}
                    </span>
                    <button onclick="toggleJobStatus(${job.id}, '${job.status}')" 
                        class="text-sm text-blue-600 hover:text-blue-800 font-medium">
                        ${job.status === 'active' ? 'Pausar' : 'Ativar'}
                    </button>
                </div>
            </div>
            
            <p class="text-gray-700 mb-4 line-clamp-2">${job.description}</p>
            
            ${job.salary ? `
                <p class="text-gray-600 mb-2">
                    <span class="font-semibold">💰 Salário:</span> ${job.salary}
                </p>
            ` : ''}
            
            ${job.interview_link ? `
                <p class="text-gray-600 mb-4">
                    <span class="font-semibold">🔗 Link entrevista:</span> 
                    <a href="${job.interview_link}" target="_blank" class="text-blue-600 hover:underline">
                        ${job.interview_link}
                    </a>
                </p>
            ` : ''}
            
            <div class="flex gap-3 mt-4 pt-4 border-t">
                <button onclick="viewMatching(${job.id})" 
                    class="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition">
                    🎯 Ver Matches (${job.applications_count || 0})
                </button>
                <button onclick="editJob(${job.id})" 
                    class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition">
                    ✏️ Editar
                </button>
                <button onclick="deleteJob(${job.id})" 
                    class="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200 transition">
                    🗑️ Excluir
                </button>
            </div>
        </div>
    `).join('');
}

// CRIAR VAGA
async function createJob(event) {
    event.preventDefault();
    
    const formData = {
        title: document.getElementById('jobTitle').value,
        description: document.getElementById('jobDescription').value,
        location: document.getElementById('jobLocation').value,
        type: document.getElementById('jobType').value,
        requirements: document.getElementById('jobRequirements').value,
        salary: document.getElementById('jobSalary').value,
        interview_link: document.getElementById('jobInterviewLink').value,
        comments: document.getElementById('jobComments').value
    };
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/jobs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Erro ao criar vaga');
        }
        
        showNotification('✅ Vaga criada com sucesso!', 'success');
        hideCreateModal();
        loadJobs();
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// EDITAR VAGA
async function editJob(jobId) {
    const job = currentJobs.find(j => j.id === jobId);
    if (!job) return;
    
    // Preencher modal com dados
    document.getElementById('jobTitle').value = job.title;
    document.getElementById('jobDescription').value = job.description;
    document.getElementById('jobLocation').value = job.location;
    document.getElementById('jobType').value = job.type || 'remoto';
    document.getElementById('jobRequirements').value = job.requirements || '';
    document.getElementById('jobSalary').value = job.salary || '';
    document.getElementById('jobInterviewLink').value = job.interview_link || '';
    document.getElementById('jobComments').value = job.comments || '';
    
    // Mudar formulário para modo edição
    const form = document.getElementById('jobForm');
    form.onsubmit = async (e) => {
        e.preventDefault();
        await updateJob(jobId);
    };
    
    document.getElementById('modalTitle').textContent = 'Editar Vaga';
    document.getElementById('submitBtn').textContent = 'Salvar Alterações';
    
    showCreateModal();
}

// ATUALIZAR VAGA
async function updateJob(jobId) {
    const formData = {
        title: document.getElementById('jobTitle').value,
        description: document.getElementById('jobDescription').value,
        location: document.getElementById('jobLocation').value,
        type: document.getElementById('jobType').value,
        requirements: document.getElementById('jobRequirements').value,
        salary: document.getElementById('jobSalary').value,
        interview_link: document.getElementById('jobInterviewLink').value,
        comments: document.getElementById('jobComments').value
    };
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/jobs/${jobId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) throw new Error('Erro ao atualizar');
        
        showNotification('✅ Vaga atualizada!', 'success');
        hideCreateModal();
        loadJobs();
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// MUDAR STATUS
async function toggleJobStatus(jobId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/jobs/${jobId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (!response.ok) throw new Error('Erro ao atualizar status');
        
        showNotification(`✅ Vaga ${newStatus === 'active' ? 'ativada' : 'pausada'}!`, 'success');
        loadJobs();
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// DELETAR VAGA
async function deleteJob(jobId) {
    if (!confirm('⚠️ Tem certeza? Esta ação não pode ser desfeita.')) return;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/jobs/${jobId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Erro ao excluir');
        
        showNotification('✅ Vaga excluída!', 'success');
        loadJobs();
        
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// VER MATCHING/TRIAGEM
async function viewMatching(jobId) {
    window.location.href = `/company/matching.html?job=${jobId}`;
}

// MODAL
function showCreateModal() {
    const modal = document.getElementById('createJobModal');
    if (!modal) return;
    // Reset form
    document.getElementById('jobForm').reset();
    document.getElementById('jobForm').onsubmit = createJob;
    document.getElementById('modalTitle').textContent = 'Criar Nova Vaga';
    document.getElementById('submitBtn').textContent = 'Criar Vaga';
    
    modal.classList.remove('hidden');
}

function hideCreateModal() {
    document.getElementById('createJobModal').classList.add('hidden');
}

// HELPERS
function getStatusBadgeClass(status) {
    return status === 'active' 
        ? 'bg-green-100 text-green-800' 
        : 'bg-gray-100 text-gray-800';
}

function getStatusLabel(status) {
    return status === 'active' ? 'Ativa' : 'Pausada';
}

function showLoading() {
    document.getElementById('loadingOverlay')?.classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingOverlay')?.classList.add('hidden');
}

function showNotification(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-2xl ${
        type === 'error' ? 'bg-red-500' : 'bg-green-500'
    } text-white z-50 animate-slide-in`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// INIT
document.addEventListener('DOMContentLoaded', loadJobs);
