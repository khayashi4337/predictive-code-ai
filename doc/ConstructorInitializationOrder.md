# コンストラクタにおけるプロパティ初期化の順序

## 概要

クラスのコンストラクタ内で、プロパティに依存するメソッドを呼び出す場合、そのプロパティはメソッド呼び出しの**前**に初期化されている必要があります。この順序を誤ると、`TypeError: Cannot read properties of undefined` のような実行時エラーが発生する可能性があります。

## 事例: `getTime` of `undefined` エラー

今回のデバッグセッションで、`InterLayerRelativeJudgementLink` および `LearningSignal` クラスにおいて、以下の同様の問題が2度発生しました。

### 問題のあるコード

```typescript
class MyClass {
  private readonly _id: string;
  private readonly _createdAt: Date;

  constructor() {
    // `generateId` は `this._createdAt` を使用するが、まだ初期化されていない
    this._id = this.generateId(); 
    this._createdAt = new Date(); // 初期化が後になっている
  }

  private generateId(): string {
    // ここで `this._createdAt` が undefined のためエラーが発生する
    const timestamp = this._createdAt.getTime(); 
    return `id_${timestamp}`;
  }
}
```

### 解決策

`_createdAt` プロパティの初期化を、`generateId` メソッドの呼び出しよりも前に移動することで、エラーを解決できます。

### 修正後のコード

```typescript
class MyClass {
  private readonly _id: string;
  private readonly _createdAt: Date;

  constructor() {
    this._createdAt = new Date(); // 先に初期化する
    this._id = this.generateId(); // その後にメソッドを呼び出す
  }

  private generateId(): string {
    const timestamp = this._createdAt.getTime();
    return `id_${timestamp}`;
  }
}
```

## 教訓

コンストラクタ内で他のメソッドを呼び出してプロパティを初期化する際は、そのメソッドが依存する他のプロパティがすべて初期化済みであることを確認することが重要です。
