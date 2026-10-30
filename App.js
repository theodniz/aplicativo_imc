import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Linking,
} from 'react-native';
import {
  buscarDadosPopulacao,
  linkDataWorldBank,
  INDICADORES,
  ANO,
} from './services/worldBank';

function classificarIMC(imc) {
  if (imc < 18.5) return 'Abaixo do peso';
  if (imc < 25) return 'Peso normal';
  if (imc < 30) return 'Sobrepeso';
  if (imc < 35) return 'Obesidade grau I';
  if (imc < 40) return 'Obesidade grau II';
  return 'Obesidade grau III';
}

// Grupo usado na comparação com os dados do World Bank
function grupoDoIMC(imc) {
  if (imc < 25) return 'normal';
  if (imc < 30) return 'sobrepeso';
  return 'obesidade';
}

const GRUPOS = [
  { chave: 'normal', nome: 'Normal', descricao: 'peso normal ou abaixo (IMC < 25)' },
  { chave: 'sobrepeso', nome: 'Sobrepeso', descricao: 'sobrepeso (IMC entre 25 e 29,9)' },
  { chave: 'obesidade', nome: 'Obesidade', descricao: 'obesidade (IMC ≥ 30)' },
];

const ADJETIVO_SEXO = { masculino: 'masculina', feminino: 'feminina' };

const formatar = (n) => n.toFixed(1).replace('.', ',');

export default function App() {
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [sexo, setSexo] = useState('masculino');
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');

  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erroApi, setErroApi] = useState('');

  async function carregarDados() {
    setCarregando(true);
    setErroApi('');
    try {
      setDados(await buscarDadosPopulacao());
    } catch (e) {
      setErroApi('Não foi possível carregar os dados do World Bank: ' + e.message);
    } finally {
      setCarregando(false);
    }
  }

  // Busca os dados da API ao abrir o app
  useEffect(() => {
    carregarDados();
  }, []);

  function calcular() {
    setErro('');
    setResultado(null);

    const p = parseFloat(peso.replace(',', '.'));
    let a = parseFloat(altura.replace(',', '.'));

    if (!p || !a || p <= 0 || a <= 0) {
      setErro('Informe peso e altura válidos.');
      return;
    }
    // Aceita altura em centímetros (ex.: 175) ou metros (ex.: 1,75)
    if (a > 3) a = a / 100;

    const imc = p / (a * a);
    setResultado({
      imc,
      classificacao: classificarIMC(imc),
      grupo: grupoDoIMC(imc),
      sexo,
    });
  }

  // Links para os dados abertos do indicador no data.worldbank.org
  function abrirFonte(s) {
    const codigo = s === 'masculino' ? INDICADORES.sobrepesoMasculino : INDICADORES.sobrepesoFeminino;
    Linking.openURL(linkDataWorldBank(codigo));
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.titulo}>Calculadora de IMC</Text>
      <Text style={styles.subtituloApp}>
        Compare seu IMC com a população brasileira (dados abertos do World Bank)
      </Text>

      <Text style={styles.label}>Sexo</Text>
      <View style={styles.linha}>
        {['masculino', 'feminino'].map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.opcao, sexo === s && styles.opcaoAtiva]}
            onPress={() => setSexo(s)}>
            <Text style={[styles.opcaoTexto, sexo === s && styles.opcaoTextoAtivo]}>
              {s === 'masculino' ? 'Masculino' : 'Feminino'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Peso (kg)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        placeholder="Ex.: 70"
        value={peso}
        onChangeText={setPeso}
      />

      <Text style={styles.label}>Altura (m)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        placeholder="Ex.: 1,75"
        value={altura}
        onChangeText={setAltura}
      />

      <TouchableOpacity style={styles.botao} onPress={calcular}>
        <Text style={styles.botaoTexto}>Calcular</Text>
      </TouchableOpacity>

      {erro !== '' && <Text style={styles.erro}>{erro}</Text>}

      {resultado && (
        <View style={styles.card}>
          <Text style={styles.imc}>IMC: {formatar(resultado.imc)}</Text>
          <Text style={styles.classificacao}>{resultado.classificacao}</Text>

          {carregando && <ActivityIndicator style={{ marginTop: 12 }} />}

          {dados && (
            <>
              <Text style={styles.comparacao}>
                Você faz parte dos{' '}
                <Text style={styles.destaque}>
                  {formatar(dados[resultado.sexo][resultado.grupo])}%
                </Text>{' '}
                da população adulta {ADJETIVO_SEXO[resultado.sexo]} do Brasil com{' '}
                {GRUPOS.find((g) => g.chave === resultado.grupo).descricao}.
              </Text>

              <Text style={styles.subtitulo}>
                População {ADJETIVO_SEXO[resultado.sexo]} brasileira ({ANO})
              </Text>
              {GRUPOS.map((g) => {
                const valor = dados[resultado.sexo][g.chave];
                const ativo = g.chave === resultado.grupo;
                return (
                  <View key={g.chave} style={styles.barraLinha}>
                    <Text style={[styles.barraLabel, ativo && styles.destaque]}>
                      {g.nome} — {formatar(valor)}%
                    </Text>
                    <View style={styles.barraFundo}>
                      <View
                        style={[styles.barra, { width: `${valor}%` }, ativo && styles.barraAtiva]}
                      />
                    </View>
                  </View>
                );
              })}
              <TouchableOpacity onPress={() => abrirFonte(resultado.sexo)}>
                <Text style={styles.fonte}>Fonte: data.worldbank.org (ver dados)</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {erroApi !== '' && (
        <View style={styles.card}>
          <Text style={styles.erro}>{erroApi}</Text>
          <TouchableOpacity style={styles.botao} onPress={carregarDados}>
            <Text style={styles.botaoTexto}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#f2f4f7',
  },
  titulo: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1d3557',
  },
  subtituloApp: {
    fontSize: 14,
    textAlign: 'center',
    color: '#555',
    marginTop: 4,
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    marginBottom: 6,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    marginBottom: 16,
  },
  linha: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  opcao: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1d3557',
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  opcaoAtiva: {
    backgroundColor: '#1d3557',
  },
  opcaoTexto: {
    fontSize: 16,
    color: '#1d3557',
  },
  opcaoTextoAtivo: {
    color: '#fff',
    fontWeight: 'bold',
  },
  botao: {
    backgroundColor: '#e63946',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  botaoTexto: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  erro: {
    color: '#e63946',
    marginTop: 12,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginTop: 24,
  },
  imc: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1d3557',
  },
  classificacao: {
    fontSize: 20,
    textAlign: 'center',
    marginTop: 4,
    color: '#457b9d',
  },
  comparacao: {
    fontSize: 16,
    marginTop: 16,
    lineHeight: 22,
    color: '#333',
  },
  destaque: {
    fontWeight: 'bold',
    color: '#e63946',
  },
  subtitulo: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
    color: '#1d3557',
  },
  barraLinha: {
    marginBottom: 10,
  },
  barraLabel: {
    fontSize: 14,
    marginBottom: 4,
    color: '#333',
  },
  barraFundo: {
    height: 12,
    backgroundColor: '#e6e6e6',
    borderRadius: 6,
    overflow: 'hidden',
  },
  barra: {
    height: 12,
    backgroundColor: '#a8dadc',
  },
  barraAtiva: {
    backgroundColor: '#e63946',
  },
  fonte: {
    fontSize: 12,
    color: '#457b9d',
    marginTop: 12,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
