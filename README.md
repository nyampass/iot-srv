# iot-srv

お手軽にIoTデバイスのステータスを管理することができ、ステータスが変わったタイミングでのJavaScriptコードの実行が可能です。

![capture](http://i.imgur.com/lioGcyq.png)

以下のボタンから、Herokuへのデプロイが可能です。

[![Herokuへのデプロイ](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

## 利用方法

デバイスごとのステータス(0から100までの数字)をiot-srvは受付、2日間のデータを保持します。<br>
デバイス名の部分は英数字を利用できます。予め登録する必要はありません。<br>

### ステータスの取得と更新

- 特定の値に更新

   ` {{host}}/<デバイス名>/<数字>`

- ステータスを100に更新

  `{{host}}/<デバイス名>/on`

- ステータスを0に更新

   `{{host}}/<デバイス名>/off`

- ステータスの確認

   `{{host}}/<デバイス名>/status`

- HTTPロングポーリングによるステータスの確認(10秒以内に応答が有り、ステータスが更新された場合には即座に応答します。)

   `{{host}}/<デバイス名>/status/polling`

### デバイス情報の確認画面

     `{{host}}/<デバイス名>`

# 開発

ニャンパス株式会社(http://nyampass.com/)
