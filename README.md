# iot-srv


![capture](http://imgur.com/ulFu0LU.gif)

お手軽にIoTデバイスのステータスを管理することができ、ステータスが変わったタイミングでのJavaScriptコードの実行が可能です。

以下のボタンから、Herokuへのデプロイが可能です。

[![Herokuへのデプロイ](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

## 利用方法

デバイスごとのステータス(0から100までの数字)をiot-srvは受付、2日間のデータを保持します。<br>
デバイス名の部分は英数字を利用できます。予め登録する必要はありません。<br>

ステータス更新

- 特定の値に更新

   {{host}}/&lt;デバイス名&gt;/&lt;数字&gt;

- ステータスを100に更新

   {{host}}/&lt;デバイス名&gt;/on

- ステータスを0に更新

   {{host}}/&lt;デバイス名&gt;/off

### ステータス確認

   {{host}}/&lt;デバイス名&gt;

# 開発

ニャンパス株式会社(http://nyampass.com/)
