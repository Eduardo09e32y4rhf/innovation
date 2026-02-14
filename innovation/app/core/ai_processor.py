import re
from collections import Counter

def calculate_match_score(job_description: str, candidate_text: str) -> int:
    """
    Calcula um score de 0 a 100 baseado na similaridade de palavras-chave
    entre a descrição da vaga e o texto do candidato (bio/skills).
    """
    if not job_description or not candidate_text:
        return 0

    # Normalizar textos (lowercase, remover pontuação básica)
    def normalize(text):
        return re.sub(r'[^\w\s]', '', text.lower())

    job_tokens = set(normalize(job_description).split())
    candidate_tokens = set(normalize(candidate_text).split())

    # Palavras-chave importantes (hardcoded para demo, mas poderia vir de um banco)
    keywords = {
        "python", "javascript", "react", "node", "sql", "aws", "docker", 
        "senior", "pleno", "junior", "liderança", "agile", "scrum",
        "java", "c#", ".net", "php", "ruby", "go", "rust",
        "machine", "learning", "data", "science", "analytics"
    }

    # Interseção de tokens relevantes
    relevant_job_tokens = job_tokens.intersection(keywords)
    
    if not relevant_job_tokens:
        # Se a vaga não tem keywords conhecidas, usa interseção simples
        intersection = job_tokens.intersection(candidate_tokens)
        score = (len(intersection) / len(job_tokens)) * 100
    else:
        # Pesa mais as keywords
        relevant_matches = relevant_job_tokens.intersection(candidate_tokens)
        score = (len(relevant_matches) / len(relevant_job_tokens)) * 100

    # Boost por tamanho do texto do candidato (currículo mais completo)
    if len(candidate_tokens) > 50:
        score += 10

    return min(int(score), 100)
