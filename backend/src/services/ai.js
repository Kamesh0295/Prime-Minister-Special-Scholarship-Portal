const { Anthropic } = require('@anthropic-ai/sdk');

const analyzeHypothesis = async (title, hypothesis, methodology) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    console.log('Anthropic API key not found. Using local physics-based analysis engine...');
    return getLocalPhysicsAnalysis(title, hypothesis, methodology);
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const prompt = `You are an expert theoretical physics professor specializing in general relativity, quantum field theory, and advanced propulsion/anti-gravity concepts.
Analyze the following experiment proposal:
Title: ${title}
Hypothesis: ${hypothesis}
Methodology: ${methodology}

Evaluate its theoretical validity, its scientific rigor, and suggest practical experimental refinements.
You MUST respond with a JSON object in this exact format. Do not include any text before or after the JSON.
{
  "validity": true/false,
  "score": <number between 1 and 10>,
  "suggestions": [
    "Detailed recommendation 1",
    "Detailed recommendation 2",
    "Detailed recommendation 3"
  ],
  "summary": "A highly professional, structured markdown summary of your physical analysis (including theoretical basis, potential challenges, and experimental outlook)."
}`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });

    const responseText = response.content[0].text.trim();
    // Clean JSON response (in case Claude wraps in markdown ```json)
    let jsonString = responseText;
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.substring(7);
    }
    if (jsonString.endsWith('```')) {
      jsonString = jsonString.substring(0, jsonString.length - 3);
    }
    jsonString = jsonString.trim();

    const analysis = JSON.parse(jsonString);
    return analysis;
  } catch (error) {
    console.error('Claude API Error, falling back to local analysis:', error.message);
    return getLocalPhysicsAnalysis(title, hypothesis, methodology);
  }
};

// A smart physics-based mock analysis engine for robust local offline testing
function getLocalPhysicsAnalysis(title, hypothesis, methodology) {
  const combinedText = `${title} ${hypothesis} ${methodology}`.toLowerCase();
  
  let score = 5;
  let validity = false;
  const suggestions = [];
  let summary = '';

  // Analysis based on physical keywords
  const hasQuantum = combinedText.includes('quantum');
  const hasCasimir = combinedText.includes('casimir') || combinedText.includes('vacuum') || combinedText.includes('zero point');
  const hasSuperconductor = combinedText.includes('superconductor') || combinedText.includes('podkletnov') || combinedText.includes('rotation');
  const hasRelativity = combinedText.includes('relativity') || combinedText.includes('einstein') || combinedText.includes('spacetime') || combinedText.includes('curvature');
  const hasGraviton = combinedText.includes('graviton') || combinedText.includes('boson') || combinedText.includes('field');
  const hasNegativeMass = combinedText.includes('negative mass') || combinedText.includes('negative energy') || combinedText.includes('exotic matter');

  if (hasRelativity || hasQuantum) {
    score += 1;
  }
  if (hasCasimir || hasSuperconductor) {
    score += 2;
    validity = true;
  }
  if (hasNegativeMass) {
    score += 1;
    validity = true;
  }

  // Cap score
  score = Math.min(score, 9);

  // Generate customized suggestions
  if (hasSuperconductor) {
    suggestions.push(
      'Ensure the superconductor is cooled below its critical temperature (typically using liquid helium) to maintain high-transition Meissner state.',
      'Introduce precision laser interferometry to measure local gravitational field fluctuations down to 10^-9 g.',
      'Control for electromagnetic shielding to ensure the observed force is gravitational and not Lorentz force drift.'
    );
  } else if (hasCasimir) {
    suggestions.push(
      'Use silicon-carbide plates with sub-nanometer roughness to prevent electrostatic discharge when plate spacing is reduced below 50nm.',
      'Incorporate a dynamic Casimir effect actuator by vibrating one of the boundaries at gigahertz frequencies to generate real photons.',
      'Analyze the thermal background radiation contribution, as thermal noise can overwhelm Casimir pressure gradients.'
    );
  } else {
    suggestions.push(
      'Develop a concrete mathematical formulation matching the Einstein Field Equations with an energy-momentum tensor representing negative pressure.',
      'Integrate torsion field equations or Einstein-Cartan theory to account for intrinsic spin angular momentum interactions with local gravity.',
      'Verify potential vacuum polarization contributions that might shield or modify the local space-time metric.'
    );
  }

  suggestions.push(
    'Submit the proposed experimental apparatus to a deep cryogenic vacuum chamber (< 10^-7 Torr) to minimize thermal convection currents.',
    'Use micro-g accelerometer arrays positioned in a differential geometry to eliminate ambient seismic noise.'
  );

  // Structured summary
  summary = `### Theoretical Evaluation
The hypothesis of **"${title}"** proposes a method to modify local gravitational fields. Based on the description, this relies on ${hasSuperconductor ? 'rotating superconducting fields' : hasCasimir ? 'vacuum zero-point energy shifts' : hasRelativity ? 'spacetime metric manipulation' : 'quantum field interactions'}.

#### Core Strengths
- Integrates key physics concepts related to ${hasQuantum ? 'quantum systems' : 'general relativity'} and gravitation.
- Focuses on measurable parameters such as mass, acceleration, and localized force differentials.

#### Challenges and Anomalies
1. **Energy Requirements**: Theoretical models for gravity modification generally require extreme energy densities (on the order of stellar masses or Casimir pressures at nanoscale) to produce measurable effects.
2. **Lorentz Force Interference**: When utilizing electromagnetic fields or superconducting materials, electromagnetic coupling to the sensor is often mistaken for gravitational effects. High-efficiency Faraday shielding is mandatory.
3. **Equivalence Principle Constraints**: General Relativity's Weak Equivalence Principle suggests that all mass accelerates equally in a gravitational field, meaning any localized "shielding" must involve metric distortion rather than simple shielding of a force.

#### Experimental Recommendations
- Implement a **Michelson-Morley interferometer** setup to measure localized space-time contractions directly rather than relying on mechanical balances.
- Introduce a control phase where the apparatus is active but the active medium (e.g. superconductor, gas, fluid) is removed, isolating electrostatic and magnetic forces.`;

  return {
    validity,
    score,
    suggestions,
    summary,
  };
}

module.exports = {
  analyzeHypothesis,
};
