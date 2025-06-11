// 認証管理クラス
class AuthManager {
  constructor() {
    this.users = JSON.parse(localStorage.getItem('users')) || [];
    this.currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
    this.initializeAuthForms();
  }

  // 認証フォームの初期化
  initializeAuthForms() {
    // フォーム切り替え処理
    document.getElementById('show-register').addEventListener('click', (e) => {
      e.preventDefault();
      document
        .getElementById('login-form-container')
        .classList.remove('active');
      document
        .getElementById('register-form-container')
        .classList.add('active');
    });

    document.getElementById('show-login').addEventListener('click', (e) => {
      e.preventDefault();
      document
        .getElementById('register-form-container')
        .classList.remove('active');
      document.getElementById('login-form-container').classList.add('active');
    });

    // 登録フォーム送信処理
    document.getElementById('register-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleRegistration();
    });

    // ログインフォーム送信処理
    document.getElementById('login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLogin();
    });
  }

  // ユーザー登録処理
  handleRegistration() {
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById(
      'register-confirm-password'
    ).value;
    const errorElement = document.getElementById('register-error');

    // 入力検証
    if (!name || !email || !password) {
      errorElement.textContent = '全ての項目を入力してください';
      return;
    }

    if (password !== confirmPassword) {
      errorElement.textContent = 'パスワードが一致しません';
      return;
    }

    if (password.length < 6) {
      errorElement.textContent = 'パスワードは6文字以上で入力してください';
      return;
    }

    // メールアドレスの重複チェック
    if (this.users.some((user) => user.email === email)) {
      errorElement.textContent = 'このメールアドレスは既に登録されています';
      return;
    }

    // ユーザー登録
    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      // 実際のアプリではパスワードをハッシュ化すべきですが、
      // クライアントサイドのみの実装ではセキュリティ上の制約があります
      password: this.simpleHash(password),
    };

    this.users.push(newUser);
    localStorage.setItem('users', JSON.stringify(this.users));

    // 登録成功後の処理
    this.login(newUser);
  }

  // ログイン処理
  handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorElement = document.getElementById('login-error');

    // 入力検証
    if (!email || !password) {
      errorElement.textContent = 'メールアドレスとパスワードを入力してください';
      return;
    }

    // ユーザー認証
    const user = this.users.find((user) => user.email === email);

    if (!user || user.password !== this.simpleHash(password)) {
      errorElement.textContent =
        'メールアドレスまたはパスワードが正しくありません';
      return;
    }

    // ログイン成功
    this.login(user);
  }

  // ログイン実行（ページ遷移に変更）
  login(user) {
    // パスワードを含まないユーザー情報をセッションに保存
    const sessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
    };

    this.currentUser = sessionUser;
    localStorage.setItem('currentUser', JSON.stringify(sessionUser));

    // ログインページを非表示、メインページを表示
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('main-page').style.display = 'block';

    // メインアプリの初期化
    app.initializeFinanceApp();
  }

  // ログアウト処理
  logout() {
    this.currentUser = null;
    localStorage.removeItem('currentUser');

    // メインページを非表示、ログインページを表示
    document.getElementById('main-page').style.display = 'none';
    document.getElementById('login-page').style.display = 'block';
  }

  // ユーザーがログインしているか確認
  isLoggedIn() {
    return this.currentUser !== null;
  }

  // 単純なハッシュ化関数（実際のアプリではより安全な方法を使用すべき）
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 32bit整数に変換
    }
    return hash.toString(16);
  }
}

// データを管理するクラス
class FinanceManager {
  constructor(userId) {
    this.userId = userId;
    this.transactions = this.loadTransactions();
  }

  // 取引を追加
  addTransaction(transaction) {
    this.transactions.push(transaction);
    this.saveTransactions();
    return transaction;
  }

  // 取引を削除
  deleteTransaction(id) {
    this.transactions = this.transactions.filter(
      (transaction) => transaction.id !== id
    );
    this.saveTransactions();
  }

  // 全ての取引を取得
  getAllTransactions() {
    return this.transactions;
  }

  // 特定の月の取引を取得
  getTransactionsByMonth(year, month) {
    return this.transactions.filter((transaction) => {
      const date = new Date(transaction.date);
      return date.getFullYear() === year && date.getMonth() === month;
    });
  }

  // 特定の月の売上合計を取得
  getMonthlyIncome(year, month) {
    const monthlyTransactions = this.getTransactionsByMonth(year, month);
    return monthlyTransactions
      .filter((transaction) => transaction.type === 'income')
      .reduce((total, transaction) => total + transaction.amount, 0);
  }

  // 特定の月の支出合計を取得
  getMonthlyExpense(year, month) {
    const monthlyTransactions = this.getTransactionsByMonth(year, month);
    return monthlyTransactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce((total, transaction) => total + transaction.amount, 0);
  }

  // 特定の月の収支バランスを取得
  getMonthlyBalance(year, month) {
    return (
      this.getMonthlyIncome(year, month) - this.getMonthlyExpense(year, month)
    );
  }

  // 累計残高を取得
  getTotalBalance() {
    return this.transactions.reduce((balance, transaction) => {
      if (transaction.type === 'income') {
        return balance + transaction.amount;
      } else {
        return balance - transaction.amount;
      }
    }, 0);
  }

  // ローカルストレージからユーザー固有のデータを読み込む
  loadTransactions() {
    const key = `transactions_${this.userId}`;
    return JSON.parse(localStorage.getItem(key)) || [];
  }

  // ローカルストレージにユーザー固有のデータを保存
  saveTransactions() {
    const key = `transactions_${this.userId}`;
    localStorage.setItem(key, JSON.stringify(this.transactions));
  }
}

// UI操作を管理するクラス
class UIManager {
  constructor(financeManager, authManager) {
    this.financeManager = financeManager;
    this.authManager = authManager;
    this.initializeEventListeners();
    this.updateUI();
    this.displayUserInfo();
  }

  // イベントリスナーの初期化
  initializeEventListeners() {
    // フォーム送信イベント
    document
      .getElementById('transaction-form')
      .addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmit();
      });

    // フィルターボタンイベント
    document.getElementById('filter-btn').addEventListener('click', () => {
      this.filterTransactions();
    });

    // ログアウトボタンイベント
    document.getElementById('logout-btn').addEventListener('click', () => {
      this.authManager.logout();
    });

    // 月フィルターの初期設定（現在の月）
    const now = new Date();
    const monthInput = document.getElementById('month-filter');
    monthInput.value = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, '0')}`;
  }

  // ユーザー情報の表示
  displayUserInfo() {
    const userNameElement = document.getElementById('user-name');
    if (this.authManager.currentUser) {
      userNameElement.textContent = this.authManager.currentUser.name;
    }
  }

  // フォーム送信処理
  handleFormSubmit() {
    const dateInput = document.getElementById('date').value;
    // 日付をyyyy/mm/dd形式で保存するための処理
    const date = dateInput;
    const description = document.getElementById('description').value;
    const type = document.getElementById('type').value;
    const amount = parseFloat(document.getElementById('amount').value);

    if (!date || !description || !amount) {
      alert('すべての項目を入力してください');
      return;
    }

    const transaction = {
      id: Date.now().toString(),
      date,
      description,
      type,
      amount,
    };

    this.financeManager.addTransaction(transaction);
    this.updateUI();
    this.resetForm();
  }

  // フォームリセット
  resetForm() {
    document.getElementById('transaction-form').reset();
    // 日付は今日の日付をデフォルトに設定
    document.getElementById('date').valueAsDate = new Date();
  }

  // 月フィルター処理
  filterTransactions() {
    this.updateUI();
  }

  // 取引削除処理
  handleDeleteTransaction(id) {
    if (confirm('この取引を削除してもよろしいですか？')) {
      this.financeManager.deleteTransaction(id);
      this.updateUI();
    }
  }

  // UI更新処理
  updateUI() {
    this.updateSummary();
    this.updateTotalBalance();
    this.displayTransactions();
  }

  // サマリー更新
  updateSummary() {
    const monthFilter = document.getElementById('month-filter').value;
    const [year, month] = monthFilter.split('-').map(Number);

    const income = this.financeManager.getMonthlyIncome(year, month - 1);
    const expense = this.financeManager.getMonthlyExpense(year, month - 1);
    const balance = income - expense;

    document.getElementById(
      'income-total'
    ).textContent = `${income.toLocaleString()}円`;
    document.getElementById(
      'expense-total'
    ).textContent = `${expense.toLocaleString()}円`;
    document.getElementById(
      'balance-total'
    ).textContent = `${balance.toLocaleString()}円`;
  }

  // 累計残高更新
  updateTotalBalance() {
    const totalBalance = this.financeManager.getTotalBalance();
    document.getElementById(
      'total-balance'
    ).textContent = `${totalBalance.toLocaleString()}円`;
  }

  // 取引履歴表示
  displayTransactions() {
    const transactionList = document.getElementById('transaction-list');
    transactionList.innerHTML = '';

    const monthFilter = document.getElementById('month-filter').value;
    const [year, month] = monthFilter.split('-').map(Number);

    const transactions = this.financeManager.getTransactionsByMonth(
      year,
      month - 1
    );

    if (transactions.length === 0) {
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML =
        '<td colspan="5" style="text-align: center;">データがありません</td>';
      transactionList.appendChild(emptyRow);
      return;
    }

    transactions.forEach((transaction) => {
      const row = document.createElement('tr');

      // 日付のフォーマット（年/月/日形式）
      const date = new Date(transaction.date);
      const formattedDate = `${date.getFullYear()}/${String(
        date.getMonth() + 1
      ).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;

      // 種類の日本語表示
      const typeText = transaction.type === 'income' ? '売上' : '支出';
      const typeColor =
        transaction.type === 'income' ? 'color: #27ae60;' : 'color: #e74c3c;';

      row.innerHTML = `
                <td>${formattedDate}</td>
                <td>${transaction.description}</td>
                <td style="${typeColor}">${typeText}</td>
                <td style="${typeColor}">${transaction.amount.toLocaleString()}円</td>
                <td><button class="delete-btn">削除</button></td>
            `;

      // 削除ボタンにイベントリスナーを追加
      const deleteBtn = row.querySelector('.delete-btn');
      deleteBtn.addEventListener('click', () => {
        this.handleDeleteTransaction(transaction.id);
      });

      transactionList.appendChild(row);
    });
  }
}

// メインアプリを管理するクラス
class App {
  constructor() {
    this.authManager = new AuthManager();
    this.checkAuthentication();
  }

  // 認証状態を確認
  checkAuthentication() {
    if (this.authManager.isLoggedIn()) {
      // ログイン済みの場合、メインページを表示
      document.getElementById('login-page').style.display = 'none';
      document.getElementById('main-page').style.display = 'block';
      this.initializeFinanceApp();
    } else {
      // 未ログインの場合、ログインページを表示
      document.getElementById('login-page').style.display = 'block';
      document.getElementById('main-page').style.display = 'none';
    }
  }

  // 財務アプリの初期化
  initializeFinanceApp() {
    // 現在の日付をデフォルトとして設定
    document.getElementById('date').valueAsDate = new Date();

    // ユーザーIDに基づいてFinanceManagerを初期化
    const userId = this.authManager.currentUser.id;
    const financeManager = new FinanceManager(userId);

    // UIManagerを初期化
    const uiManager = new UIManager(financeManager, this.authManager);
  }
}

// アプリ初期化
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new App();
});
