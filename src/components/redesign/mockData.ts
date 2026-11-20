import type { Character, Question } from '../../types/game';
import { STANDARD_15_CHARACTERS } from '../../utils/characters';

// 90 Personagens realistas para testes de estresse em todas as escalas (15, 30, 60, 90)
// Inclui nomes longos reais vistos no print do usuário para testar quebras de linha e tamanhos de fonte
export const MOCK_90_CHARACTERS: Character[] = [
  // Linha 1 (do print real do usuário)
  { id: 'mock_1', name: 'Salsicha', imageUrl: '/standard-faces/Bruno.jpg' },
  { id: 'mock_2', name: 'Draculaura', imageUrl: '/standard-faces/Elisa.jpg' },
  { id: 'mock_3', name: 'Erika', imageUrl: '/standard-faces/Ana.jpg' },
  { id: 'mock_4', name: 'Rabito', imageUrl: '/standard-faces/Davi.jpg' },
  { id: 'mock_5', name: 'Ganley', imageUrl: '/standard-faces/Felipe.jpg' },
  { id: 'mock_6', name: 'Marina', imageUrl: '/standard-faces/Marina.jpg' },
  { id: 'mock_7', name: 'Joel', imageUrl: '/standard-faces/Hugo.jpg' },
  { id: 'mock_8', name: 'Renan', imageUrl: '/standard-faces/joao.jpg' },
  { id: 'mock_9', name: 'Castiel', imageUrl: '/standard-faces/Lucas.jpg' },
  { id: 'mock_10', name: 'Nicolás', imageUrl: '/standard-faces/Nilton.jpg' },

  // Linha 2 (do print real do usuário)
  { id: 'mock_11', name: 'Speed', imageUrl: '/standard-faces/Lucas.jpg' },
  { id: 'mock_12', name: 'MrBeast', imageUrl: '/standard-faces/Felipe.jpg' },
  { id: 'mock_13', name: 'Chi', imageUrl: '/standard-faces/Gabi.jpg' },
  { id: 'mock_14', name: 'Adriana Lima', imageUrl: '/standard-faces/Ana.jpg' },
  { id: 'mock_15', name: 'Everson', imageUrl: '/standard-faces/Bruno.jpg' },
  { id: 'mock_16', name: 'Charli', imageUrl: '/standard-faces/Carla.jpg' },
  { id: 'mock_17', name: 'Larissa', imageUrl: '/standard-faces/Iara.jpg' },
  { id: 'mock_18', name: 'Barriguinha', imageUrl: '/standard-faces/Hugo.jpg' },
  { id: 'mock_19', name: 'Kanye', imageUrl: '/standard-faces/Nilton.jpg' },
  { id: 'mock_20', name: 'Emmanuel', imageUrl: '/standard-faces/joao.jpg' },

  // Linha 3 (do print real do usuário - nomes longos com quebra)
  { id: 'mock_21', name: 'PinkPantheress', imageUrl: '/standard-faces/Carla.jpg' },
  { id: 'mock_22', name: 'Renan Ribeiro', imageUrl: '/standard-faces/Lucas.jpg' },
  { id: 'mock_23', name: 'Manoel Gomes', imageUrl: '/standard-faces/Nilton.jpg' },
  { id: 'mock_24', name: 'Mike Wazowski', imageUrl: '/standard-faces/Davi.jpg' },
  { id: 'mock_25', name: 'Amado Batista', imageUrl: '/standard-faces/Hugo.jpg' },
  { id: 'mock_26', name: "D'Baby", imageUrl: '/standard-faces/Paula.jpg' },
  { id: 'mock_27', name: 'Eduarda', imageUrl: '/standard-faces/Elisa.jpg' },
  { id: 'mock_28', name: 'Steve', imageUrl: '/standard-faces/Felipe.jpg' },
  { id: 'mock_29', name: 'Lana Del Rey', imageUrl: '/standard-faces/katia.jpg' },
  { id: 'mock_30', name: 'Joelma', imageUrl: '/standard-faces/Paula.jpg' },

  // Mais 30 personagens para baralhos de 60
  { id: 'mock_31', name: 'Zendaya', imageUrl: '/standard-faces/Ana.jpg' },
  { id: 'mock_32', name: 'Neymar Jr', imageUrl: '/standard-faces/Bruno.jpg' },
  { id: 'mock_33', name: 'Billie Eilish', imageUrl: '/standard-faces/Carla.jpg' },
  { id: 'mock_34', name: 'Casimiro', imageUrl: '/standard-faces/Hugo.jpg' },
  { id: 'mock_35', name: 'Anitta', imageUrl: '/standard-faces/Gabi.jpg' },
  { id: 'mock_36', name: 'Alok', imageUrl: '/standard-faces/joao.jpg' },
  { id: 'mock_37', name: 'Whindersson', imageUrl: '/standard-faces/Lucas.jpg' },
  { id: 'mock_38', name: 'Ivete Sangalo', imageUrl: '/standard-faces/Paula.jpg' },
  { id: 'mock_39', name: 'Ludmilla', imageUrl: '/standard-faces/Iara.jpg' },
  { id: 'mock_40', name: 'Pabllo Vittar', imageUrl: '/standard-faces/katia.jpg' },
  { id: 'mock_41', name: 'Faustão', imageUrl: '/standard-faces/Nilton.jpg' },
  { id: 'mock_42', name: 'Xuxa Meneghel', imageUrl: '/standard-faces/Elisa.jpg' },
  { id: 'mock_43', name: 'Silvio Santos', nickname: 'Silvio', imageUrl: '/standard-faces/Hugo.jpg' },
  { id: 'mock_44', name: 'Gisele Bündchen', nickname: 'Gisele', imageUrl: '/standard-faces/Ana.jpg' },
  { id: 'mock_45', name: 'Rodrigo Faro', nickname: 'Faro', imageUrl: '/standard-faces/Felipe.jpg' },
  { id: 'mock_46', name: 'Maisa Silva', nickname: 'Maisa', imageUrl: '/standard-faces/Gabi.jpg' },
  { id: 'mock_47', name: 'Marcos Mion', nickname: 'Mion', imageUrl: '/standard-faces/Bruno.jpg' },
  { id: 'mock_48', name: 'Sabrina Sato', nickname: 'Sabrina', imageUrl: '/standard-faces/Carla.jpg' },
  { id: 'mock_49', name: 'Luciano Huck', nickname: 'Huck', imageUrl: '/standard-faces/joao.jpg' },
  { id: 'mock_50', name: 'Tatá Werneck', nickname: 'Tatá', imageUrl: '/standard-faces/Iara.jpg' },
  { id: 'mock_51', name: 'Ronaldo Fenômeno', nickname: 'Ronaldo', imageUrl: '/standard-faces/Nilton.jpg' },
  { id: 'mock_52', name: 'Marta Vieira', nickname: 'Marta', imageUrl: '/standard-faces/Paula.jpg' },
  { id: 'mock_53', name: 'Ayrton Senna', nickname: 'Senna', imageUrl: '/standard-faces/Lucas.jpg' },
  { id: 'mock_54', name: 'Pelé', imageUrl: '/standard-faces/Nilton.jpg' },
  { id: 'mock_55', name: 'Gretchen', imageUrl: '/standard-faces/katia.jpg' },
  { id: 'mock_56', name: 'Juliette', imageUrl: '/standard-faces/Ana.jpg' },
  { id: 'mock_57', name: 'Gil do Vigor', nickname: 'Gil', imageUrl: '/standard-faces/Bruno.jpg' },
  { id: 'mock_58', name: 'Supla', imageUrl: '/standard-faces/Felipe.jpg' },
  { id: 'mock_59', name: 'Inês Brasil', nickname: 'Inês', imageUrl: '/standard-faces/Paula.jpg' },
  { id: 'mock_60', name: 'Padre Marcelo', nickname: 'Pe. Marcelo', imageUrl: '/standard-faces/Hugo.jpg' },

  // Mais 30 personagens para baralhos de 90
  { id: 'mock_61', name: 'Shrek', imageUrl: '/standard-faces/Hugo.jpg' },
  { id: 'mock_62', name: 'Fiona', imageUrl: '/standard-faces/Carla.jpg' },
  { id: 'mock_63', name: 'Bob Esponja', nickname: 'Bob', imageUrl: '/standard-faces/Davi.jpg' },
  { id: 'mock_64', name: 'Patrick Estrela', nickname: 'Patrick', imageUrl: '/standard-faces/Nilton.jpg' },
  { id: 'mock_65', name: 'Lula Molusco', nickname: 'Lula Molusco', imageUrl: '/standard-faces/joao.jpg' },
  { id: 'mock_66', name: 'Goku', imageUrl: '/standard-faces/Lucas.jpg' },
  { id: 'mock_67', name: 'Vegeta', imageUrl: '/standard-faces/Felipe.jpg' },
  { id: 'mock_68', name: 'Naruto Uzumaki', nickname: 'Naruto', imageUrl: '/standard-faces/Davi.jpg' },
  { id: 'mock_69', name: 'Sasuke Uchiha', nickname: 'Sasuke', imageUrl: '/standard-faces/Lucas.jpg' },
  { id: 'mock_70', name: 'Sakura Haruno', nickname: 'Sakura', imageUrl: '/standard-faces/Gabi.jpg' },
  { id: 'mock_71', name: 'Homem-Aranha', nickname: 'Aranha', imageUrl: '/standard-faces/Davi.jpg' },
  { id: 'mock_72', name: 'Batman', imageUrl: '/standard-faces/joao.jpg' },
  { id: 'mock_73', name: 'Coringa', imageUrl: '/standard-faces/Felipe.jpg' },
  { id: 'mock_74', name: 'Mulher-Maravilha', nickname: 'Maravilha', imageUrl: '/standard-faces/Ana.jpg' },
  { id: 'mock_75', name: 'Superman', imageUrl: '/standard-faces/Bruno.jpg' },
  { id: 'mock_76', name: 'Barbie', imageUrl: '/standard-faces/katia.jpg' },
  { id: 'mock_77', name: 'Ken', imageUrl: '/standard-faces/Felipe.jpg' },
  { id: 'mock_78', name: 'Mário Bros', nickname: 'Mario', imageUrl: '/standard-faces/Hugo.jpg' },
  { id: 'mock_79', name: 'Luigi Bros', nickname: 'Luigi', imageUrl: '/standard-faces/Hugo.jpg' },
  { id: 'mock_80', name: 'Princesa Peach', nickname: 'Peach', imageUrl: '/standard-faces/Elisa.jpg' },
  { id: 'mock_81', name: 'Sonic', imageUrl: '/standard-faces/Lucas.jpg' },
  { id: 'mock_82', name: 'Pikachu', imageUrl: '/standard-faces/Davi.jpg' },
  { id: 'mock_83', name: 'Elsa de Arendelle', nickname: 'Elsa', imageUrl: '/standard-faces/Elisa.jpg' },
  { id: 'mock_84', name: 'Moana', imageUrl: '/standard-faces/Iara.jpg' },
  { id: 'mock_85', name: 'Harry Potter', nickname: 'Harry', imageUrl: '/standard-faces/Davi.jpg' },
  { id: 'mock_86', name: 'Hermione Granger', nickname: 'Hermione', imageUrl: '/standard-faces/Carla.jpg' },
  { id: 'mock_87', name: 'Ron Weasley', nickname: 'Ron', imageUrl: '/standard-faces/Felipe.jpg' },
  { id: 'mock_88', name: 'Dumbledore', imageUrl: '/standard-faces/Hugo.jpg' },
  { id: 'mock_89', name: 'Voldemort', imageUrl: '/standard-faces/Nilton.jpg' },
  { id: 'mock_90', name: 'Severo Snape', nickname: 'Snape', imageUrl: '/standard-faces/joao.jpg' },
];

export function getMockDeck(count: 15 | 30 | 60 | 90): Character[] {
  if (count === 15) {
    return STANDARD_15_CHARACTERS;
  }
  return MOCK_90_CHARACTERS.slice(0, count);
}

export const INITIAL_MOCK_QUESTIONS: Question[] = [
  {
    id: 'q_1',
    senderId: 'user_1',
    senderName: 'carvalho',
    text: 'O seu personagem é uma mulher?',
    answer: true,
    timestamp: Date.now() - 95000,
  },
  {
    id: 'q_2',
    senderId: 'user_2',
    senderName: 'Teste',
    text: 'O seu personagem tem cabelo escuro?',
    answer: true,
    timestamp: Date.now() - 70000,
  },
  {
    id: 'q_3',
    senderId: 'user_1',
    senderName: 'carvalho',
    text: 'O seu personagem usa óculos ou chapéu?',
    answer: false,
    timestamp: Date.now() - 42000,
  },
];
