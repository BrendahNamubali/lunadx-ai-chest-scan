import os
import json
import logging
from typing import List, Dict, Any, Optional
from main import Finding

logger = logging.getLogger(__name__)

class ReportDrafter:
    """
    Generate structured radiology reports from AI findings.
    Supports multiple modes: Groq AI, Claude AI, and template-based.
    """
    
    def __init__(self):
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
        
        # Initialize HTTP clients if API keys are available
        self.groq_client = None
        self.anthropic_client = None
        
        if self.groq_api_key:
            try:
                import httpx
                self.groq_client = httpx.Client()
                logger.info("Groq client initialized")
            except ImportError:
                logger.warning("httpx not available for Groq client")
        
        if self.anthropic_api_key:
            try:
                import httpx
                self.anthropic_client = httpx.Client()
                logger.info("Anthropic client initialized")
            except ImportError:
                logger.warning("httpx not available for Anthropic client")
    
    def generate_report(self, findings: List[Finding], patient_id: str = None, 
                       view_position: str = "PA", clinical_notes: str = None) -> Dict[str, Any]:
        """
        Generate a structured radiology report
        
        Args:
            findings: List of AI findings with probabilities
            patient_id: Patient identifier
            view_position: X-ray view (PA/AP)
            clinical_notes: Additional clinical context
            
        Returns:
            Dictionary with report sections
        """
        # Try different modes in order of preference
        for mode in ['groq', 'claude', 'template']:
            try:
                if mode == 'groq' and self.groq_client:
                    return self._generate_groq_report(findings, patient_id, view_position, clinical_notes)
                elif mode == 'claude' and self.anthropic_client:
                    return self._generate_claude_report(findings, patient_id, view_position, clinical_notes)
                elif mode == 'template':
                    return self._generate_template_report(findings, patient_id, view_position, clinical_notes)
            except Exception as e:
                logger.warning(f"Failed to generate report using {mode}: {e}")
                continue
        
        # Final fallback
        return self._generate_template_report(findings, patient_id, view_position, clinical_notes)
    
    def _generate_groq_report(self, findings: List[Finding], patient_id: str, 
                              view_position: str, clinical_notes: str) -> Dict[str, Any]:
        """Generate report using Groq AI (Llama)"""
        
        # Prepare findings for prompt
        findings_text = self._format_findings_for_prompt(findings)
        
        prompt = f"""Generate a structured radiology report in JSON format with these exact keys: "indication", "technique", "findings_text", "impression", "recommendation".

Context:
- Patient ID: {patient_id or 'Unknown'}
- View: {view_position} chest X-ray
- Clinical notes: {clinical_notes or 'None provided'}
- AI Findings: {findings_text}

Requirements:
- Use professional radiology language
- Be concise but thorough
- Focus on flagged findings (>50% probability)
- Include specific recommendations for significant findings
- Return ONLY the JSON object, no markdown or explanation

Example format:
{{"indication": "...", "technique": "...", "findings_text": "...", "impression": "...", "recommendation": "..."}}"""

        try:
            response = self.groq_client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.groq_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                    "max_tokens": 500
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                result = response.json()
                content = result["choices"][0]["message"]["content"]
                
                # Parse JSON response
                try:
                    report_data = json.loads(content.strip())
                    report_data["source"] = "groq-llama3.3-70b"
                    return report_data
                except json.JSONDecodeError:
                    # Try to extract JSON from response
                    if "{" in content and "}" in content:
                        json_start = content.find("{")
                        json_end = content.rfind("}") + 1
                        json_content = content[json_start:json_end]
                        report_data = json.loads(json_content)
                        report_data["source"] = "groq-llama3.3-70b"
                        return report_data
                    else:
                        raise ValueError("No valid JSON found in response")
            
            else:
                raise Exception(f"Groq API error: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Groq report generation failed: {e}")
            raise
    
    def _generate_claude_report(self, findings: List[Finding], patient_id: str,
                               view_position: str, clinical_notes: str) -> Dict[str, Any]:
        """Generate report using Anthropic Claude"""
        
        findings_text = self._format_findings_for_prompt(findings)
        
        prompt = f"""Generate a structured radiology report in JSON format with these exact keys: "indication", "technique", "findings_text", "impression", "recommendation".

Context:
- Patient ID: {patient_id or 'Unknown'}
- View: {view_position} chest X-ray
- Clinical notes: {clinical_notes or 'None provided'}
- AI Findings: {findings_text}

Requirements:
- Use professional radiology language
- Be concise but thorough
- Focus on flagged findings (>50% probability)
- Include specific recommendations for significant findings
- Return ONLY the JSON object, no markdown or explanation

Example format:
{{"indication": "...", "technique": "...", "findings_text": "...", "impression": "...", "recommendation": "..."}}"""

        try:
            response = self.anthropic_client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": self.anthropic_api_key,
                    "Content-Type": "application/json",
                    "anthropic-version": "2023-06-01"
                },
                json={
                    "model": "claude-3-sonnet-20240229",
                    "max_tokens": 500,
                    "messages": [{"role": "user", "content": prompt}]
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                result = response.json()
                content = result["content"][0]["text"]
                
                # Parse JSON response
                try:
                    report_data = json.loads(content.strip())
                    report_data["source"] = "claude-sonnet"
                    return report_data
                except json.JSONDecodeError:
                    # Try to extract JSON from response
                    if "{" in content and "}" in content:
                        json_start = content.find("{")
                        json_end = content.rfind("}") + 1
                        json_content = content[json_start:json_end]
                        report_data = json.loads(json_content)
                        report_data["source"] = "claude-sonnet"
                        return report_data
                    else:
                        raise ValueError("No valid JSON found in response")
            
            else:
                raise Exception(f"Claude API error: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Claude report generation failed: {e}")
            raise
    
    def _generate_template_report(self, findings: List[Finding], patient_id: str,
                                 view_position: str, clinical_notes: str) -> Dict[str, Any]:
        """Generate template-based report without AI APIs"""
        
        # Separate flagged and normal findings
        flagged_findings = [f for f in findings if f.severity == "flagged" and f.probability > 0.3]
        normal_findings = [f for f in findings if f.severity == "normal" or f.probability <= 0.3]
        
        # Build report sections
        indication = f"Chest X-ray evaluation for {patient_id or 'patient'}"
        if clinical_notes:
            indication += f". Clinical context: {clinical_notes}"
        
        technique = f"{view_position} chest radiograph"
        
        # Findings text
        if flagged_findings:
            findings_text = "Abnormalities identified: "
            finding_descriptions = []
            
            for finding in flagged_findings[:5]:  # Limit to top 5
                desc = f"{finding.pathology} ({finding.probability:.0%} confidence)"
                if finding.probability > 0.7:
                    desc = f"Prominent {desc}"
                finding_descriptions.append(desc)
            
            findings_text += "; ".join(finding_descriptions) + "."
            
            if len(flagged_findings) > 5:
                findings_text += f" Additional findings noted ({len(flagged_findings) - 5} more)."
        else:
            findings_text = "No acute cardiopulmonary abnormalities detected."
        
        if normal_findings and len(normal_findings) > 0:
            findings_text += f" Low probability findings include: {', '.join([f.pathology for f in normal_findings[:3]])}."
        
        # Impression
        if flagged_findings:
            if len(flagged_findings) == 1:
                impression = f"Single abnormality detected: {flagged_findings[0].pathology}"
            else:
                top_findings = [f.pathology for f in flagged_findings[:3]]
                impression = f"Multiple abnormalities detected: {', '.join(top_findings)}"
            
            # Add severity context
            high_confidence = [f for f in flagged_findings if f.probability > 0.7]
            if high_confidence:
                impression += f" (high confidence for {len(high_confidence)} findings)"
        else:
            impression = "Normal chest X-ray examination"
        
        # Recommendation
        if flagged_findings:
            recommendations = []
            
            # Specific recommendations based on findings
            for finding in flagged_findings:
                if "Pneumonia" in finding.pathology or "Consolidation" in finding.pathology:
                    recommendations.append("Consider clinical correlation for infection; possible antibiotic therapy")
                elif "Effusion" in finding.pathology:
                    recommendations.append("Consider further evaluation with ultrasound or CT if clinically indicated")
                elif "Cardiomegaly" in finding.pathology:
                    recommendations.append("Cardiology consultation may be considered")
                elif "Nodule" in finding.pathology or "Mass" in finding.pathology:
                    recommendations.append("CT scan recommended for further characterization")
                elif "Pneumothorax" in finding.pathology:
                    recommendations.append("Urgent clinical evaluation recommended")
            
            # Add general recommendation
            if not recommendations:
                recommendations.append("Clinical correlation recommended")
            
            recommendation = "; ".join(recommendations[:2])  # Limit to 2 recommendations
            if len(recommendations) > 2:
                recommendation += ". Additional follow-up may be needed."
        else:
            recommendation = "Routine follow-up as clinically indicated"
        
        return {
            "indication": indication,
            "technique": technique,
            "findings_text": findings_text,
            "impression": impression,
            "recommendation": recommendation,
            "source": "template"
        }
    
    def _format_findings_for_prompt(self, findings: List[Finding]) -> str:
        """Format findings for AI prompt"""
        formatted = []
        
        for finding in findings:
            status = "FLAGGED" if finding.severity == "flagged" else "Normal"
            formatted.append(f"- {finding.pathology}: {finding.probability:.1%} ({status}) [ICD-10: {finding.icd10_code}]")
        
        return "\n".join(formatted)
    
    def get_available_modes(self) -> List[str]:
        """Return list of available report generation modes"""
        modes = ["template"]
        if self.groq_client:
            modes.insert(0, "groq")
        if self.anthropic_client:
            modes.insert(0, "claude")
        return modes
