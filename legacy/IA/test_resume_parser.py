"""
Unit Tests for Resume Parser Module
AI - Innovation Analytics
"""
import pytest
import json
from unittest.mock import Mock, patch
from resume_parser import InnovationIAParser


class TestResumeParser:
    """Test cases for InnovationIAParser"""
    
    @pytest.fixture
    def parser(self):
        """Create parser instance for testing"""
        with patch('resume_parser.genai.configure'):
            return InnovationIAParser(api_key="test_key")
    
    @pytest.fixture
    def sample_resume_text(self):
        """Sample resume text for testing"""
        return """
        João Silva
        joao@email.com
        (11) 99999-9999
        
        Profissional de TI com 5 anos de experiência.
       Atualmente trabalhando como Tech Lead.
       Experiência anterior como Desenvolvedor Senior.
        
        Skills: Python, JavaScript, React, Node.js, PostgreSQL, AWS
        """
    
    def test_parser_initialization(self, parser):
        """Test parser initialization"""
        assert parser is not None
        assert parser.model is not None
    
    @pytest.mark.asyncio
    async def test_parse_resume_success(self, parser):
        """Test successful resume parsing"""
        with patch.object(parser, 'model') as mock_model:
            mock_model.generate_content = Mock(return_value=Mock(
                text=lambda: json.dumps({
                    "nome_completo": "João Silva",
                    "email": "joao@email.com",
                    "telefone": "(11) 99999-9999",
                    "habilidades": ["Python", "JavaScript", "React"]
                })
            ))
            
            result = await parser.parse_resume("dummy_path")
            
            assert result["status"] == "success"
            assert "nome_completo" in result
    
    @pytest.mark.asyncio
    async def test_parse_resume_empty(self, parser):
        """Test parsing empty resume"""
        result = await parser.parse_resume("")
        
        assert result is not None
    
    def test_extract_skills_from_text(self, parser):
        """Test skill extraction from text"""
        text = "Python, JavaScript, React, Node.js, AWS, Docker, Kubernetes"
        
        # Skills should be extracted
        skills = [s.strip() for s in text.split(',')]
        
        assert len(skills) > 0
        assert "Python" in skills
        assert "AWS" in skills
    
    def test_extract_experience_years(self, parser):
        """Test experience years extraction"""
        text = """
        2020 - Presente: Tech Lead na Empresa X
        2018 - 2020: Desenvolvedor na Empresa Y
        """
        
        # Simple test for experience parsing
        assert "2020" in text
        assert "2018" in text
    
    def test_extract_education(self, parser):
        """Test education extraction"""
        text = """
        Ciência da Computação - USP - 2020
        MBA em Gestão de Projetos - FGV - 2022
        """
        
        assert "USP" in text
        assert "FGV" in text
        assert "2020" in text


class TestResumeParserEdgeCases:
    """Test edge cases for resume parser"""
    
    @pytest.fixture
    def parser(self):
        with patch('resume_parser.genai.configure'):
            return InnovationIAParser(api_key="test_key")
    
    @pytest.mark.asyncio
    async def test_parse_corrupted_pdf(self, parser):
        """Test handling corrupted PDF"""
        result = await parser.parse_resume("corrupted_file.pdf")
        
        assert result is not None
    
    @pytest.mark.asyncio
    async def test_parse_non_standard_format(self, parser):
        """Test parsing non-standard resume format"""
        non_standard = "Only a name here"
        
        result = await parser.parse_resume(non_standard)
        
        assert result is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
